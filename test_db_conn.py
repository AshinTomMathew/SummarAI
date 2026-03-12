import psycopg2
urls = [
    "postgresql://postgres.uwsckiidzqbfizrqnjjz:8590529494%40%23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres.uwsckiidzqbfizrqnjjz:8590529494%40%23@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
]
for url in urls:
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        print(f"SUCCESS: {url}")
        conn.close()
    except Exception as e:
        print(f"FAILED: {url} - {e}")
