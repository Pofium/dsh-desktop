import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const ROOT = resolve('.');
const DIST_EXE = join(ROOT, 'dist-exe');
const APP_DIR = join(DIST_EXE, 'DeepSeek-Harness');
const TOOLS_DIR = join(DIST_EXE, 'tools');
const WIX_DIR = join(TOOLS_DIR, 'wix', 'tools');
const RELEASE_DIR = join(ROOT, 'dist-release');
const BUILD_TEMP = join(DIST_EXE, 'msi-build');

const APP_NAME = 'DeepSeek Harness';
const APP_EXE = 'DeepSeek Harness.exe';
const APP_VERSION = '0.1.2.0';
const DISPLAY_VERSION = '0.1.2';
const MANUFACTURER = 'DeepSeek AI';
const UPGRADE_CODE = 'B488C9F7-7422-4D90-A8EA-6126B431D89F';
const ICON_PATH = join(DIST_EXE, 'dsh.ico');

const NUGET_WIX_URL = 'https://www.nuget.org/api/v2/package/WiX/3.11.2';

console.log('=== Building Windows MSI Installer for DeepSeek Harness ===');

if (!existsSync(APP_DIR) || !existsSync(join(APP_DIR, APP_EXE))) {
  console.log('App binaries not found in', APP_DIR);
  console.log('Running package-app.mjs first...');
  execSync('node dist-exe/package-app.mjs', { stdio: 'inherit', cwd: ROOT });
}

// 1. Ensure WiX Toolset binaries
function ensureWix() {
  const candlePath = join(WIX_DIR, 'candle.exe');
  const lightPath = join(WIX_DIR, 'light.exe');

  if (existsSync(candlePath) && existsSync(lightPath)) {
    console.log('WiX Toolset ready at:', WIX_DIR);
    return;
  }

  console.log('Downloading WiX 3.11 from NuGet mirror...');
  mkdirSync(join(TOOLS_DIR, 'wix'), { recursive: true });
  const nupkgPath = join(TOOLS_DIR, 'wix.nupkg');

  execSync(`curl.exe -L -o "${nupkgPath}" "${NUGET_WIX_URL}"`, { stdio: 'inherit' });
  execSync(`tar.exe -xf "${nupkgPath}" -C "${join(TOOLS_DIR, 'wix')}"`, { stdio: 'inherit' });
  rmSync(nupkgPath, { force: true });
  console.log('WiX Toolset extracted successfully.');
}

// 2. Helpers for deterministic GUIDs and safe XML IDs
function generateGuid(seed) {
  const hash = crypto.createHash('md5').update('DSH_MSI_' + seed).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`.toUpperCase();
}

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

// 3. Harvest directories and files for WiX
function harvestAppFiles(sourceDir) {
  let dirCounter = 0;
  let fileCounter = 0;
  const components = [];
  const directoriesMap = new Map();

  function scan(currentDir, parentDirId) {
    const entries = readdirSync(currentDir);
    const subDirs = [];
    const files = [];

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        subDirs.push(entry);
      } else {
        files.push(entry);
      }
    }

    for (const f of files) {
      const filePath = join(currentDir, f);
      const relPath = relative(sourceDir, filePath);
      const fileId = `File_${sanitizeId(f)}_${++fileCounter}`;
      const compId = `Comp_${sanitizeId(f)}_${fileCounter}`;
      const compGuid = generateGuid(relPath);
      const isMainExe = (currentDir === sourceDir && f === APP_EXE);

      let compXml = `    <Component Id="${compId}" Directory="${parentDirId}" Guid="${compGuid}" Win64="yes">\n`;
      if (isMainExe) {
        compXml += `      <File Id="${fileId}" Source="${filePath}" Name="${f}" KeyPath="yes">\n`;
        compXml += `        <Shortcut Id="DesktopShortcut" Directory="DesktopFolder" Name="${APP_NAME}" WorkingDirectory="APPLICATIONROOTDIRECTORY" Icon="AppIcon.ico" IconIndex="0" Advertise="yes" />\n`;
        compXml += `        <Shortcut Id="StartMenuShortcut" Directory="ApplicationProgramsFolder" Name="${APP_NAME}" WorkingDirectory="APPLICATIONROOTDIRECTORY" Icon="AppIcon.ico" IconIndex="0" Advertise="yes" />\n`;
        compXml += `      </File>\n`;
      } else {
        compXml += `      <File Id="${fileId}" Source="${filePath}" Name="${f}" KeyPath="yes" />\n`;
      }
      compXml += `    </Component>`;

      components.push({ id: compId, xml: compXml });
    }

    for (const sd of subDirs) {
      const dirIndex = ++dirCounter;
      const dirId = `Dir_${sanitizeId(sd)}_${dirIndex}`;
      const fullSubPath = join(currentDir, sd);
      directoriesMap.set(dirId, { name: sd, index: dirIndex, parentId: parentDirId });
      scan(fullSubPath, dirId);
    }
  }

  scan(sourceDir, 'APPLICATIONROOTDIRECTORY');
  return { components, directoriesMap };
}

function buildDirectoryTreeXml(directoriesMap) {
  function getChildren(parentId) {
    const result = [];
    for (const [id, info] of directoriesMap.entries()) {
      if (info.parentId === parentId) {
        result.push({ id, ...info });
      }
    }
    return result;
  }

  function render(parentId, indent = '          ') {
    const children = getChildren(parentId);
    let xml = '';
    for (const child of children) {
      xml += `${indent}<Directory Id="${child.id}" Name="${child.name}">\n`;
      xml += render(child.id, indent + '  ');
      xml += `${indent}</Directory>\n`;
    }
    return xml;
  }

  return render('APPLICATIONROOTDIRECTORY');
}

function main() {
  ensureWix();

  mkdirSync(BUILD_TEMP, { recursive: true });
  mkdirSync(RELEASE_DIR, { recursive: true });

  const { components, directoriesMap } = harvestAppFiles(APP_DIR);
  const dirStructureXml = buildDirectoryTreeXml(directoriesMap);
  const componentsXml = components.map(c => c.xml).join('\n');

  const wxsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*"
           Name="${APP_NAME}"
           Language="1033"
           Version="${APP_VERSION}"
           Manufacturer="${MANUFACTURER}"
           UpgradeCode="${UPGRADE_CODE}">

    <Package InstallerVersion="500"
             Compressed="yes"
             InstallPrivileges="elevated"
             Platform="x64"
             Description="${APP_NAME} Installer"
             Comments="DeepSeek Harness AI Agent Desktop" />

    <MajorUpgrade DowngradeErrorMessage="A newer version of [ProductName] is already installed."
                  AllowSameVersionUpgrades="yes" />

    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />

    <Icon Id="AppIcon.ico" SourceFile="${ICON_PATH}" />
    <Property Id="ARPPRODUCTICON" Value="AppIcon.ico" />
    <Property Id="ARPHELPLINK" Value="https://github.com/Pofium/dsh-desktop" />
    <Property Id="ARPURLINFOABOUT" Value="https://deepseek.com" />
    <Property Id="ApplicationFolderName" Value="${APP_NAME}" />
    <Property Id="WixAppFolder" Value="WixPerUserFolder" />
    <WixVariable Id="WixUISupportPerUser" Value="1" />
    <WixVariable Id="WixUISupportPerMachine" Value="1" />

    <!-- Standard Windows Installer Directory Layout -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="APPLICATIONROOTDIRECTORY" Name="${APP_NAME}">
${dirStructureXml}
        </Directory>
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="${APP_NAME}">
          <Component Id="Comp_StartMenuShortcutFolder" Guid="6E04A7F1-3D28-44A5-901B-CEB889C71D3A">
            <RemoveFolder Id="CleanUpProgramMenuDir" On="uninstall" />
            <RegistryValue Root="HKMU" Key="Software\\${MANUFACTURER}\\${APP_NAME}" Name="StartMenuShortcut" Type="integer" Value="1" KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>
      <Directory Id="DesktopFolder" Name="Desktop" />
    </Directory>

    <!-- Component Group for All App Files -->
    <ComponentGroup Id="ProductComponents">
${componentsXml}
    </ComponentGroup>

    <!-- Main Feature -->
    <Feature Id="MainApplication" Title="${APP_NAME}" Level="1">
      <ComponentRef Id="Comp_StartMenuShortcutFolder" />
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>

    <!-- Advanced UI with Per-User or Per-Machine Selection -->
    <UIRef Id="WixUI_Advanced" />
    <UIRef Id="WixUI_ErrorProgressText" />

  </Product>
</Wix>
`;

  const wxsPath = join(BUILD_TEMP, 'DeepSeekHarness.wxs');
  writeFileSync(wxsPath, wxsContent, 'utf8');
  console.log('WiX source generated at:', wxsPath);

  const candle = join(WIX_DIR, 'candle.exe');
  const light = join(WIX_DIR, 'light.exe');
  const wixUIExt = join(WIX_DIR, 'WixUIExtension.dll');
  const wixUtilExt = join(WIX_DIR, 'WixUtilExtension.dll');

  const wixobjPath = join(BUILD_TEMP, 'DeepSeekHarness.wixobj');
  const msiFilename = `DeepSeek-Harness-v${DISPLAY_VERSION}-windows-x64.msi`;
  const msiPath = join(RELEASE_DIR, msiFilename);

  console.log('Compiling WiX source (candle.exe)...');
  execSync(`"${candle}" -ext "${wixUIExt}" -ext "${wixUtilExt}" -arch x64 -out "${wixobjPath}" "${wxsPath}"`, { stdio: 'inherit' });

  console.log('Linking MSI package (light.exe)...');
  execSync(`"${light}" -ext "${wixUIExt}" -ext "${wixUtilExt}" -sval -out "${msiPath}" "${wixobjPath}"`, { stdio: 'inherit' });

  if (existsSync(msiPath)) {
    const sizeMB = (statSync(msiPath).size / (1024 * 1024)).toFixed(2);
    const copyPath = join(RELEASE_DIR, 'DeepSeek-Harness-Setup-v0.1.2.msi');
    copyFileSync(msiPath, copyPath);
    console.log('\n======================================================');
    console.log(`  SUCCESS! Windows MSI Package generated (${sizeMB} MB) at:`);
    console.log(`  ${msiPath}`);
    console.log(`  Copy created at: ${copyPath}`);
    console.log('======================================================\n');
  } else {
    throw new Error(`MSI file was not found at ${msiPath}`);
  }
}

main();
