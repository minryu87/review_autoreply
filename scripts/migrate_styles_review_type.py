# 기존 styles 테이블의 데이터를 긍정/부정(review_type)으로 분리하여 이관하는 스크립트
from app import engine, Style
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
session = Session()

styles = session.query(Style).all()

for s in styles:
    # 이미 review_type이 있으면 skip
    if s.review_type:
        continue
    # 기존 row를 positive/negative 두 개로 복제
    for review_type in ['positive', 'negative']:
        new_style = Style(
            id=s.id,
            hospital=s.hospital,
            name=s.name,
            review_type=review_type,
            active=s.active,
            settings=s.settings,
            answer_length=s.answer_length,
            additional_content=s.additional_content,
            feedback=s.feedback,
            last_answer=s.last_answer
        )
        session.add(new_style)
    session.delete(s)

session.commit()
session.close()
print('styles 테이블 review_type 분리 마이그레이션 완료')
