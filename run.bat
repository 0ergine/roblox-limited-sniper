@echo off
:Start
node index.js
:: restarting in 5 seconds.
TIMEOUT /T 5
GOTO:Start
