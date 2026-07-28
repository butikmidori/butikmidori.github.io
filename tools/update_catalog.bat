@echo off
cd /d "%~dp0"
python update_catalog_from_excel.py
if errorlevel 1 (
  echo.
  echo Gagal memperbarui katalog. Pastikan Python terinstal.
  pause
  exit /b 1
)
echo.
echo catalog-data.js sudah diperbarui dari Excel.
pause
