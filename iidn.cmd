@setlocal
@echo off

REM check node
for %%X in (node.exe) do (set FOUND=%%~$PATH:X)
if defined FOUND (
	echo [IIDN] ** Using node... **
	call nodejs\iidn.cmd
	goto end
) ELSE (
	echo [IIDN] Node.js is missing. Set PATH to node.
)

for %%X in (java.exe) do (set FOUND=%%~$PATH:X)
if defined FOUND (
	echo [IIDN] ** Using java (6+)... **
	call rhino\iidn.cmd
	goto end
) ELSE (
	echo [IIDN] Java(6+) is missing. Set JAVA_HOME or PATH to java.
)


echo [IIDN] No appropriate runtime. Bye.

:end
@endlocal
