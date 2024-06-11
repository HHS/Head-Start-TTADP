FROM python:3.9.19
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip freeze > requirements.txt
EXPOSE 5000
ENV FLASK_ENV=development
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "8080", "--debug"]
