@echo off
setlocal enabledelayedexpansion

:: 1. Database Credentials & Paths
:: Adjust the WAMP path if your installation folder is different
set MYSQLDUMP_PATH="C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe"
set DB_USER=tracahexing
set DB_PASS=Hex@traca123
set DB_NAME=meter-packaging
set BASE_BACKUP_DIR=D:\Database_Backups

:: 2. Safely extract the current Year, Month, Day, and Hour
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set hour=%datetime:~8,2%

:: Create the Date folder string (e.g., 2026-06-18)
set DATE_FOLDER=%year%_-%month%-%day%

:: 3. Determine the Shift Folder based on the execution hour
if "%hour%"=="05" (
    set SHIFT_FOLDER=backup_05_AM
) else if "%hour%"=="13" (
    set SHIFT_FOLDER=backup_13_PM
) else if "%hour%"=="21" (
    set SHIFT_FOLDER=backup_21_PM
) else (
    :: Fallback just in case it is run manually at a different hour
    set SHIFT_FOLDER=backup_%hour%
)

:: 4. Build the Target Directory and File Path
set TARGET_DIR=%BASE_BACKUP_DIR%\%DATE_FOLDER%\%SHIFT_FOLDER%
set BACKUP_FILE=%TARGET_DIR%\%DB_NAME%.bak

:: Create the nested folders if they don't exist
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: 5. Execute the Backup
:: Note: The password variable is enclosed in quotes to protect the "@" symbol.
%MYSQLDUMP_PATH% -u %DB_USER% -p"%DB_PASS%" %DB_NAME% > "%BACKUP_FILE%"

:: 6. Auto-Cleanup: Delete any .bak files older than 30 days to save server disk space
forfiles /p %BASE_BACKUP_DIR% /s /m *.bak /d -30 /c "cmd /c del @path"

echo Shift backup completed successfully: %BACKUP_FILE%
endlocal