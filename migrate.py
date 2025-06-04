from app import create_tables, migrate_existing_data

if __name__ == "__main__":
    create_tables()
    migrate_existing_data()
    print("[DB 마이그레이션 완료]") 