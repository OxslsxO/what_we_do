@echo off

REM 切换环境脚本
REM 使用方法: switch-env.bat development 或 switch-env.bat production

set env=%1
if "%env%"=="" set env=development

REM 替换配置文件中的环境变量
powershell -Command "(Get-Content config\api.js) -replace 'const env = \'.*?\';', 'const env = \'%env%\';' | Set-Content config\api.js"

echo 环境已切换为: %env%
if "%env%"=="development" (
    echo API地址: http://localhost:3000
) else (
    echo API地址: https://your-production-api.com
)

pause
