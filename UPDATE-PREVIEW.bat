@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo mi.do.ri - Automatic Product Preview Generator
echo Version 3.2.0
echo =============================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON=py -3"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON=python"
  ) else (
    echo Python belum tersedia di komputer ini.
    echo Gunakan GitHub Actions ^> Update Product Previews ^> Run workflow,
    echo atau install Python 3 terlebih dahulu.
    echo.
    pause
    exit /b 1
  )
)

echo Memastikan Pillow tersedia...
%PYTHON% -c "import PIL" >nul 2>nul
if not %errorlevel%==0 (
  echo Pillow belum ada. Mencoba memasang dependency...
  %PYTHON% -m pip install -r tools\requirements-preview.txt
  if not %errorlevel%==0 (
    echo Gagal memasang Pillow.
    echo Gunakan GitHub Actions sebagai alternatif tanpa setup lokal.
    pause
    exit /b 1
  )
)

echo.
echo Mengambil data katalog live jika tersedia, lalu membuat preview...
%PYTHON% tools\generate_product_previews.py --source auto --write-fallback
if not %errorlevel%==0 (
  echo.
  echo UPDATE PREVIEW GAGAL. Lihat pesan error di atas.
  pause
  exit /b 1
)

echo.
echo SELESAI.
echo File yang biasanya berubah:
echo - produk\
echo - assets\images\share\
echo - assets\data\catalog-data.js
echo - index.html / katalog.html / assets\js\app.js ^(versi/cache bila perlu^)
echo - tools\preview-generation-report.json
echo.
echo Setelah diperiksa, upload/commit perubahan tersebut ke GitHub.
pause
