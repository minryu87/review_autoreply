from flask import Flask, render_template, request, jsonify, send_from_directory, redirect
import os
import requests
from dotenv import load_dotenv
import csv
from datetime import datetime
import json
import time
import threading
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, BigInteger, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pandas as pd
import glob
load_dotenv()

app = Flask(__name__, static_folder='static')

# appData에서 긍정/부정 옵션, 샘플 리뷰를 그대로 파이썬으로 옮김
POSITIVE_SETTINGS = [
    {"id": 1, "label": "인사말", "options": ["정중한 인사", "간단한 인사", "생략"], "examples": ["안녕하세요, 방문해주셔서 감사합니다.", "반갑습니다!", "(생략)"]},
    {"id": 2, "label": "고객 호칭", "options": ["적극적 호명", "간접적 호명", "호칭 생략"], "examples": ["홍길동 고객님", "고객님", "(생략)"]},
    {"id": 3, "label": "감사/사과 표현", "options": ["적극적 감사", "일반적 감사", "간단한 감사"], "examples": ["진심으로 감사드립니다.", "감사합니다.", "(생략)"]},
    {"id": 4, "label": "공감/친밀 어조", "options": ["감정적 공감", "절제된 공감", "공감 생략"], "examples": ["마음이 따뜻해집니다.", "공감합니다.", "(생략)"]},
    {"id": 5, "label": "답변 상세도", "options": ["상세형", "간략형", "최소형"], "examples": ["자세히 안내드립니다.", "간단히 안내드립니다.", "최소한의 안내"]},
    {"id": 6, "label": "추가 안내/의견 대응", "options": ["적극적 안내", "제한적 안내", "안내 없음"], "examples": ["추가 안내드립니다.", "필요시 안내드립니다.", "(생략)"]},
    {"id": 7, "label": "재방문 유도", "options": ["적극적 유도", "소극적 유도", "유도 멘트 없음"], "examples": ["다시 방문해 주세요!", "기회가 되면 또 뵙겠습니다.", "(생략)"]},
    {"id": 8, "label": "마무리 인사", "options": ["적극적 맺음말", "공식적 맺음말", "맺음말 없음"], "examples": ["행복한 하루 되세요!", "감사합니다.", "(생략)"]},
    {"id": 9, "label": "이모티콘 사용", "options": ["적극적 사용", "제한적 사용", "사용 안 함"], "examples": ["😊👍", "^_^", "(생략)"]}
]

NEGATIVE_SETTINGS = [
    {"id": 1, "label": "인사말", "options": ["정중한 인사", "간단한 인사", "생략"], "examples": ["안녕하세요, 고객님.", "안녕하세요.", "(생략)"]},
    {"id": 2, "label": "고객 호칭", "options": ["적극적 호명", "간접적 호명", "호칭 생략"], "examples": ["홍길동 고객님", "고객님", "(생략)"]},
    {"id": 3, "label": "감사/사과 표현", "options": ["적극적 사과", "일반적 사과", "간단한 사과"], "examples": ["불편을 드려 진심으로 죄송합니다.", "죄송합니다.", "유감입니다."]},
    {"id": 4, "label": "공감/친밀 어조", "options": ["적극적 공감", "절제된 공감", "공감 생략"], "examples": ["마음이 무거워집니다.", "공감합니다.", "(생략)"]},
    {"id": 5, "label": "답변 상세도", "options": ["상세형", "간략형", "최소형"], "examples": ["자세히 안내드립니다.", "간단히 안내드립니다.", "최소한의 안내"]},
    {"id": 6, "label": "추가 안내/의견 대응", "options": ["적극적 안내", "제한적 안내", "안내 없음"], "examples": ["추가 안내드립니다.", "필요시 안내드립니다.", "(생략)"]},
    {"id": 7, "label": "재방문 유도", "options": ["적극적 유도", "소극적 유도", "유도 멘트 없음"], "examples": ["다시 방문해 주시면 감사하겠습니다.", "기회가 되면 또 뵙겠습니다.", "(생략)"]},
    {"id": 8, "label": "마무리 인사", "options": ["감사 중심 마무리", "사과 중심 마무리", "맺음말 없음"], "examples": ["감사합니다.", "죄송합니다.", "(생략)"]}
]

SAMPLE_REVIEWS = [
    {"id": "positive1", "type": "positive", "content": "의사선생님이 친절하게 설명해주셔서 좋았습니다. 간호사분들도 모두 친절하고 병원이 깨끗해서 만족합니다. 다음에도 방문할 예정입니다!"},
    {"id": "positive2", "type": "positive", "content": "진료를 받기까지 대기시간이 짧았고, 검사 결과도 빠르게 나와서 좋았습니다. 의료진 분들이 모두 전문적이면서도 따뜻하게 대해주셔서 감사했습니다."},
    {"id": "negative1", "type": "negative", "content": "접수할 때 직원이 불친절했고, 대기시간이 너무 길었습니다. 예약 시간보다 1시간 이상 기다렸는데 별다른 안내도 없어서 불편했습니다."},
    {"id": "negative2", "type": "negative", "content": "진료비가 다른 병원보다 비싸다고 느꼈고, 의사 선생님이 설명을 대충 하시는 것 같아서 아쉬웠습니다. 추가 검사도 꼭 필요한지 의문이 들었습니다."}
]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
# GEMINI_MODEL = "gemini-2.5-pro-preview-05-06"
GEMINI_MODEL = "gemini-2.0-flash-lite"

HOSPITALS = ["솔동물의료센터", "원진치과의원", "수지미래산부인과"]
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# 병원별 폴더 생성
for h in HOSPITALS:
    os.makedirs(os.path.join(DATA_DIR, h), exist_ok=True)

def get_hospital_data_path(hospital, fname):
    return os.path.join(DATA_DIR, hospital, fname)

# 병원별 누적 피드백 저장/불러오기 함수 추가
def get_feedback_history_path(hospital):
    return get_hospital_data_path(hospital, 'feedback_history.txt')

def load_hospital_feedback(hospital):
    path = get_feedback_history_path(hospital)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    return ''

def save_hospital_feedback(hospital, feedback):
    path = get_feedback_history_path(hospital)
    with open(path, 'a', encoding='utf-8') as f:
        if feedback.strip():
            f.write(feedback.strip() + '\n')

STYLE_FILENAME = 'styles.json'

def get_hospital_styles_path(hospital):
    return os.path.join(DATA_DIR, hospital, STYLE_FILENAME)

REVIEW_API_URL = "https://prod.medilawyer.co.kr/api/v1/posts?pageSize=10&pageNo=1&storeId={storeId}&channelIdList=NAVER_MAP,GOOGLE_MAP,KAKAO_MAP&sortOption=LATEST&replyFilter=HAS_REPLY&reviewType={reviewType}"
STORE_ID_MAP = {
    "솔동물의료센터": 1844,
    "원진치과의원": 1604,
    "수지미래산부인과": 2210
}
SAMPLE_REVIEWS_POSITIVE = [
    {"id": "sample_pos_1", "content": "의사선생님이 친절하게 설명해주셔서 좋았습니다. 병원이 깨끗해서 만족합니다.", "author": "홍길동", "score": 5},
    {"id": "sample_pos_2", "content": "진료를 받기까지 대기시간이 짧았고, 의료진 분들이 모두 전문적이었습니다.", "author": "김철수", "score": 5}
]
SAMPLE_REVIEWS_NEGATIVE = [
    {"id": "sample_neg_1", "content": "직원이 불친절했고, 대기시간이 너무 길었습니다.", "author": "이영희", "score": 1},
    {"id": "sample_neg_2", "content": "진료비가 비싸고, 설명이 부족했습니다.", "author": "박민수", "score": 2}
]

def get_review_cache_path(hospital, review_type):
    return os.path.join(DATA_DIR, hospital, f"reviews_{review_type}.json")

@app.route("/")
def main():
    return render_template("main.html")

@app.route("/style_detail/<style_id>")
def style_detail(style_id):
    # 임시: 기존 index.html을 재활용 (추후 별도 템플릿 분리 가능)
    return send_from_directory('.', 'index.html')

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory('static', filename)

@app.route("/settings")
def get_settings():
    return jsonify({
        "positive_settings": POSITIVE_SETTINGS,
        "negative_settings": NEGATIVE_SETTINGS,
        "sample_reviews": SAMPLE_REVIEWS
    })

@app.route("/hospital_data")
def hospital_data():
    hospital = request.args.get('hospital')
    if not hospital or hospital not in HOSPITALS:
        return jsonify({"error": "병원명이 올바르지 않습니다."}), 400
    try:
        options_path = get_hospital_data_path(hospital, 'last_options.json')
        feedback_path = get_hospital_data_path(hospital, 'last_feedback.json')
        answer_path = get_hospital_data_path(hospital, 'last_answer.txt')
        options = {}
        feedback = ''
        answer = ''
        if os.path.exists(options_path):
            with open(options_path, 'r', encoding='utf-8') as f:
                options = json.load(f)
        if os.path.exists(feedback_path):
            with open(feedback_path, 'r', encoding='utf-8') as f:
                feedback = f.read()
        if os.path.exists(answer_path):
            with open(answer_path, 'r', encoding='utf-8') as f:
                answer = f.read()
        # 병원별 누적 피드백도 반환
        feedback_history = load_hospital_feedback(hospital)
        return jsonify({"options": options, "feedback": feedback, "answer": answer, "feedback_history": feedback_history})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    review_content = data.get("review_content", "")
    settings = data.get("settings", {})
    review_type = data.get("review_type", "positive")
    hospital = data.get("hospital", "")
    answer_length = data.get("answer_length", "medium")
    additional_content = data.get("additional_content", "")
    feedback = data.get("feedback", "")
    last_answer = data.get("last_answer", "")
    review_id = data.get("review_id", "")

    if hospital not in HOSPITALS:
        return jsonify({"error": "병원명이 올바르지 않습니다."}), 400

    # 병원별 누적 피드백 불러오기
    feedback_history = load_hospital_feedback(hospital)

    # 답변 길이 텍스트 변환
    length_map = {"short": "1문장", "medium": "2~3문장", "long": "4~5문장"}
    length_text = length_map.get(answer_length, "2~3문장")

    settings_text = "\n".join([f"- {k}: {v}" for k, v in settings.items()])
    prompt = f'''다음은 병원 리뷰에 대한 답변을 작성하는 작업입니다.\n\n리뷰 내용:\n"{review_content}"\n\n답변 설정 ({'긍정' if review_type == 'positive' else '부정'} 리뷰):\n{settings_text}\n\n답변은 {length_text}으로 작성해 주세요.'''
    if additional_content:
        prompt += f"\n\n아래 내용을 반드시 포함해 주세요: {additional_content}"
    if feedback_history:
        prompt += f"\n\n이 병원 답변에 항상 반영해야 할 피드백: {feedback_history}"
    if feedback and last_answer:
        prompt += f"\n\n이전 답변: {last_answer}\n\n아래 피드백을 반영해 답변을 다시 작성해 주세요: {feedback}"
    prompt += "\n답변은 자연스럽고 진정성 있게 작성하되, 설정된 모든 요소들을 적절히 포함시켜 주세요. 한국어로 작성해주세요."

    # Gemini API 호출
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    import pprint
    try:
        print("[Gemini API 요청] URL:", url)
        print("[Gemini API 요청] Payload:")
        pprint.pprint(payload)
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        print("[Gemini API 응답] Status:", resp.status_code)
        print("[Gemini API 응답] Body:")
        print(resp.text)
        resp.raise_for_status()
        data = resp.json()
        # Gemini 응답 구조에 따라 파싱
        if data.get("candidates") and data["candidates"][0].get("content") and data["candidates"][0]["content"].get("parts"):
            answer = data["candidates"][0]["content"]["parts"][0]["text"]
            # 병원별 옵션/피드백/답변 저장
            import json
            options_path = get_hospital_data_path(hospital, 'last_options.json')
            feedback_path = get_hospital_data_path(hospital, 'last_feedback.json')
            answer_path = get_hospital_data_path(hospital, 'last_answer.txt')
            with open(options_path, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False)
            with open(feedback_path, 'w', encoding='utf-8') as f:
                f.write(feedback or '')
            with open(answer_path, 'w', encoding='utf-8') as f:
                f.write(answer)
            # 피드백/답변 csv 저장
            csv_path = get_hospital_data_path(hospital, 'feedback_history.csv')
            with open(csv_path, 'a', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    datetime.now().isoformat(),
                    review_id,
                    review_content,
                    str(settings),
                    answer_length,
                    additional_content,
                    feedback,
                    answer
                ])
            # 답변 생성 후 피드백 누적 저장
            save_hospital_feedback(hospital, feedback)
            return jsonify({"result": answer})
        else:
            return jsonify({"error": "API 응답에서 답변을 찾을 수 없습니다.", "raw": data}), 500
    except Exception as e:
        import traceback
        print("[Gemini API 예외 발생]")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/hospital_styles', methods=['GET', 'POST'])
def hospital_styles():
    session = SessionLocal()
    try:
        hospital = request.args.get('hospital') if request.method == 'GET' else request.json.get('hospital')
        if not hospital or hospital not in HOSPITALS:
            return jsonify({'error': '병원명이 올바르지 않습니다.'}), 400
        if request.method == 'GET':
            styles = session.query(Style).filter_by(hospital=hospital).all()
            # SQLAlchemy 객체를 dict로 변환
            style_dicts = []
            for s in styles:
                style_dicts.append({
                    'id': s.id,
                    'name': s.name,
                    'active': s.active,
                    'settings': s.settings or {},
                    'answerLength': s.answer_length or 'medium',
                    'additionalContent': s.additional_content or '',
                    'feedback': s.feedback or '',
                    'lastAnswer': s.last_answer or ''
                })
            return jsonify({'styles': style_dicts})
        else:  # POST
            styles = request.json.get('styles', [])
            # 기존 hospital의 스타일 모두 비활성화(초기화)
            db_styles = {s.id: s for s in session.query(Style).filter_by(hospital=hospital).all()}
            for style in styles:
                s = db_styles.get(style.get('id'))
                if s:
                    s.name = style.get('name')
                    s.active = style.get('active', False)
                    s.settings = style.get('settings', {})
                    s.answer_length = style.get('answerLength', 'medium')
                    s.additional_content = style.get('additionalContent', '')
                    s.feedback = style.get('feedback', '')
                    s.last_answer = style.get('lastAnswer', '')
                else:
                    s = Style(
                        id=style.get('id'),
                        hospital=hospital,
                        name=style.get('name'),
                        active=style.get('active', False),
                        settings=style.get('settings', {}),
                        answer_length=style.get('answerLength', 'medium'),
                        additional_content=style.get('additionalContent', ''),
                        feedback=style.get('feedback', ''),
                        last_answer=style.get('lastAnswer', '')
                    )
                    session.add(s)
            # DB에 없는 스타일은 삭제(동기화)
            style_ids = set(s['id'] for s in styles)
            for db_id, db_style in db_styles.items():
                if db_id not in style_ids:
                    session.delete(db_style)
            session.commit()
            return jsonify({'result': 'ok'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/hospital_reviews')
def hospital_reviews():
    hospital = request.args.get('hospital')
    review_type = request.args.get('type', 'positive')
    if not hospital or hospital not in HOSPITALS:
        return jsonify({'error': '병원명이 올바르지 않습니다.'}), 400
    if review_type not in ['positive', 'negative']:
        return jsonify({'error': '리뷰 타입이 올바르지 않습니다.'}), 400
    cache_path = get_review_cache_path(hospital, review_type)
    # 캐시 우선
    if os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            reviews = json.load(f)
        if reviews:
            return jsonify({'reviews': reviews})
    # 외부 API 호출
    store_id = STORE_ID_MAP.get(hospital)
    api_type = 'POSITIVE' if review_type == 'positive' else 'NEGATIVE'
    url = REVIEW_API_URL.format(storeId=store_id, reviewType=api_type)
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        reviews = []
        for r in data.get('data', {}).get('data', []):
            reviews.append({
                'id': r.get('postId'),
                'content': r.get('content'),
                'author': r.get('author'),
                'score': r.get('score'),
                'reply': r.get('reply'),
                'authorDtm': r.get('authorDtm'),
                'channelId': r.get('channelId')
            })
        # 없으면 샘플 리뷰 fallback
        if not reviews:
            reviews = SAMPLE_REVIEWS_POSITIVE if review_type == 'positive' else SAMPLE_REVIEWS_NEGATIVE
        # 캐시 저장
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(reviews, f, ensure_ascii=False, indent=2)
        return jsonify({'reviews': reviews})
    except Exception as e:
        # 에러 시 샘플 리뷰 fallback
        reviews = SAMPLE_REVIEWS_POSITIVE if review_type == 'positive' else SAMPLE_REVIEWS_NEGATIVE
        return jsonify({'reviews': reviews, 'error': str(e)})

# --- SQLAlchemy 및 DB 연동 설정 추가 ---
DB_HOST = "postgresql-iycp1-u45006.vm.elestio.app"
DB_PORT = 25432
DB_USER = "postgres"
DB_PASS = "5Po04bJb-K3oH-qFtcR5CG"
DB_NAME = "postgres"

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- ORM 모델 정의 ---
class FeedbackHistory(Base):
    __tablename__ = "feedback_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    hospital = Column(String(128))
    created_at = Column(DateTime)
    review_id = Column(String(128))
    review_content = Column(Text)
    options = Column(JSON)
    answer_length = Column(String(16))
    additional_content = Column(Text)
    feedback = Column(Text)
    answer = Column(Text)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String(128), primary_key=True)
    hospital = Column(String(128))
    content = Column(Text)
    author = Column(String(128))
    score = Column(Integer)
    reply = Column(Text)
    author_dtm = Column(BigInteger)
    channel_id = Column(String(32))
    review_type = Column(String(16))

class Style(Base):
    __tablename__ = "styles"
    id = Column(String(64), primary_key=True)
    hospital = Column(String(128))
    name = Column(String(128))
    active = Column(Boolean)
    settings = Column(JSON)
    answer_length = Column(String(16))
    additional_content = Column(Text)
    feedback = Column(Text)
    last_answer = Column(Text)

# --- 테이블 생성 ---
def create_tables():
    Base.metadata.create_all(bind=engine)

# --- 1회용 마이그레이션 함수 ---
def migrate_existing_data():
    session = SessionLocal()
    try:
        # 병원 목록
        hospitals = ["수지미래산부인과", "원진치과의원", "솔동물의료센터"]
        for hospital in hospitals:
            data_dir = os.path.join(DATA_DIR, hospital)
            # 1. feedback_history.csv
            csv_path = os.path.join(data_dir, "feedback_history.csv")
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path, header=None)
                for row in df.itertuples(index=False):
                    session.add(FeedbackHistory(
                        hospital=hospital,
                        created_at=row[0],
                        review_id=row[1],
                        review_content=row[2],
                        options=row[3] if row[3] else None,
                        answer_length=row[4],
                        additional_content=row[5] if len(row) > 5 else None,
                        feedback=row[6] if len(row) > 6 else None,
                        answer=row[7] if len(row) > 7 else None
                    ))
            # 2. reviews_positive.json
            pos_path = os.path.join(data_dir, "reviews_positive.json")
            if os.path.exists(pos_path):
                with open(pos_path, "r", encoding="utf-8") as f:
                    reviews = json.load(f)
                    for r in reviews:
                        session.merge(Review(
                            id=r.get("id"),
                            hospital=hospital,
                            content=r.get("content"),
                            author=r.get("author"),
                            score=r.get("score"),
                            reply=r.get("reply"),
                            author_dtm=r.get("authorDtm"),
                            channel_id=r.get("channelId"),
                            review_type="positive"
                        ))
            # 3. reviews_negative.json
            neg_path = os.path.join(data_dir, "reviews_negative.json")
            if os.path.exists(neg_path):
                with open(neg_path, "r", encoding="utf-8") as f:
                    reviews = json.load(f)
                    for r in reviews:
                        session.merge(Review(
                            id=r.get("id"),
                            hospital=hospital,
                            content=r.get("content"),
                            author=r.get("author"),
                            score=r.get("score"),
                            reply=None,
                            author_dtm=None,
                            channel_id=None,
                            review_type="negative"
                        ))
            # 4. styles.json
            styles_path = os.path.join(data_dir, "styles.json")
            if os.path.exists(styles_path):
                with open(styles_path, "r", encoding="utf-8") as f:
                    styles = json.load(f)
                    for s in styles:
                        session.merge(Style(
                            id=s.get("id"),
                            hospital=hospital,
                            name=s.get("name"),
                            active=s.get("active", False),
                            settings=s.get("settings", {}),
                            answer_length=s.get("answer_length", "medium"),
                            additional_content=s.get("additional_content", ""),
                            feedback=s.get("feedback", ""),
                            last_answer=s.get("last_answer", "")
                        ))
        session.commit()
        print("[마이그레이션 완료]")
    except Exception as e:
        session.rollback()
        print("[마이그레이션 오류]", e)
    finally:
        session.close()

# --- 메인 실행부 ---
if __name__ == "__main__":
    create_tables()
    app.run(host="0.0.0.0", port=8080, debug=True)
