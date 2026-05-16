docker run --rm -it -p 8185:8080 -v "$PWD:/app" -w /app python:3.12-alpine python3 -m http.server 8080
