@echo off
:: thêm đường dẫn node.exe và npm.cmd vào PATH tạm thời
set PATH=%CD%\node-v22.20.0-win-x64;%CD%\node-v22.20.0-win-x64\npm;%PATH%
echo Node.js portable đã sẵn sàng. Gõ "node -v" hoặc "npm -v" để kiểm tra.
cd quiz_app
npx electron .
cmd
