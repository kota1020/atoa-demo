#!/bin/bash
cd "$(dirname "$0")"
echo "AtoA demo → http://localhost:8899"
python3 -m http.server 8899
