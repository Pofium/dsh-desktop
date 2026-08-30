; Inno Setup Script for DeepSeek Harness Desktop
; Compatible with Windows 10 and Windows 11 (x64)

#define MyAppName "DeepSeek Harness"
#define MyAppVersion "0.1.1"
#define MyAppPublisher "DeepSeek AI"
#define MyAppURL "https://github.com/deepseek-ai/deepseek-harness"
#define MyAppExeName "DeepSeek Harness.exe"

[Setup]
AppId={{D5H8A805-E7C8-4C8D-81EF-9ACD562EB4EF}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\DeepSeek Harness
DisableProgramGroupPage=yes
LicenseFile=..\..\LICENSE
PrivilegesRequired=lowest
OutputDir=..\output
OutputBaseFilename=DeepSeek-Harness-Setup-{#MyAppVersion}
SetupIconFile=..\dsh.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\DeepSeek-Harness\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
