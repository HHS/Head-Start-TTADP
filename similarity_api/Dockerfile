FROM python:3.9.17
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install psycopg2
RUN pip freeze > requirements.txt
EXPOSE 5000
ENV FLASK_ENV=development
CMD ["flask", "run", "--host", "0.0.0.0", "--debug"]
