# Aryan Gold Attendance



Flutter employee attendance and services application for Android, web, and supported desktop targets, locally branded for Aryan Gold.



## Documentation



- [User guide](docs/USER_GUIDE.md): installation, sign-in, attendance, employee workflows, permissions, troubleshooting, privacy, and support.

- [Developer and publication guide](docs/DEVELOPER_GUIDE.md): setup, architecture, configuration, testing, signing, publication, verification, rollback, and maintenance.

- [Repository instructions](AGENTS.md): mandatory documentation updates for every change.



Current application version: `5.0.36+5037`.



The complete frontend source and platform folders were restored from `aryangold/attendance_app` at commit `557e01dff11a839ded29495aac623fc42e6ff899`, then locally rebranded for Aryan Gold. Fresh builds target `https://attendance.aryangold.in/api`. Local Android and web builds must pass `--dart-define=API_BASE_URL=http://127.0.0.1:8000/api`; the emulator connects through `adb reverse tcp:8000 tcp:8000`. See the developer guide for tooling and build instructions.



## Quick start



```powershell

flutter pub get

flutter analyze --no-pub

flutter test

flutter run

```



Read the developer guide before configuring production services or creating a release.
