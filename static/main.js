// 메인화면: 병원 선택, 스타일 목록, 리뷰/답변 미리보기, 스타일 상세 연동

let styleList = [];
let reviewList = [];
let activeStyleId = null;
let currentReviewIdx = 0;
let hospitalList = ["솔동물의료센터", "원진치과의원", "수지미래산부인과"];
let selectedHospital = hospitalList[0];
let isGenerating = false;
let reviewTypeTab = 'positive'; // 'positive' or 'negative'
let positiveReviews = [];
let negativeReviews = [];

function getDefaultStyles() {
  // 병원별 스타일 저장 구조를 서버에서 불러오도록 변경 필요
  return [
    { id: 'default1', name: '기본 스타일 1', active: true },
    { id: 'default2', name: '기본 스타일 2', active: false },
  ];
}

function renderHospitalSelect() {
  const container = document.getElementById('hospitalSelectArea');
  container.innerHTML = '';
  const select = document.createElement('select');
  select.id = 'hospitalSelect';
  hospitalList.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    select.appendChild(opt);
  });
  select.value = selectedHospital;
  select.onchange = function(e) {
    selectedHospital = e.target.value;
    loadHospitalStylesAndReviews(selectedHospital);
  };
  container.appendChild(select);
}

function renderStyleList() {
  const listDiv = document.getElementById('styleList');
  listDiv.innerHTML = '';
  styleList.forEach(style => {
    const item = document.createElement('div');
    item.className = 'style-item' + (style.active ? ' active' : '');
    const name = document.createElement('span');
    name.className = 'style-name';
    name.textContent = style.name;
    const actions = document.createElement('span');
    actions.className = 'style-actions';
    // ON/OFF 버튼
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = style.active ? 'ON' : 'OFF';
    toggleBtn.onclick = () => setActiveStyle(style.id);
    // 수정 버튼
    const editBtn = document.createElement('button');
    editBtn.textContent = '수정';
    editBtn.onclick = () => goToStyleDetail(style.id);
    // 이름 수정 버튼
    const renameBtn = document.createElement('button');
    renameBtn.textContent = '이름 수정';
    renameBtn.onclick = async () => {
      const newName = prompt('새 스타일 이름을 입력하세요', style.name);
      if (newName && newName !== style.name) {
        style.name = newName;
        await saveHospitalStyles();
        renderStyleList();
      }
    };
    // 제거 버튼
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '제거';
    removeBtn.onclick = async () => {
      if (confirm('정말 이 스타일을 삭제하시겠습니까?')) {
        styleList = styleList.filter(s => s.id !== style.id);
        await saveHospitalStyles();
        renderStyleList();
      }
    };
    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(removeBtn);
    item.appendChild(name);
    item.appendChild(actions);
    listDiv.appendChild(item);
  });
}

async function loadHospitalStyles(hospital) {
  const res = await fetch(`/hospital_styles?hospital=${encodeURIComponent(hospital)}`);
  if (res.ok) {
    const data = await res.json();
    styleList = data.styles || [];
    if (styleList.length === 0) styleList = getDefaultStyles();
    activeStyleId = styleList.find(s=>s.active)?.id || (styleList[0]?.id ?? null);
    renderStyleList();
    renderAnswerPreview();
  }
}

async function saveHospitalStyles() {
  await fetch('/hospital_styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital: selectedHospital, styles: styleList })
  });
}

function setActiveStyle(id) {
  styleList.forEach(s => s.active = (s.id === id));
  activeStyleId = id;
  saveHospitalStyles();
  renderStyleList();
  renderAnswerPreview();
}

function goToStyleDetail(id) {
  const style = styleList.find(s => s.id === id);
  const styleName = style ? style.name : '';
  window.location.href = `/style_detail/${id}?hospital=${encodeURIComponent(selectedHospital)}&styleName=${encodeURIComponent(styleName)}`;
}

// 리뷰/답변 미리보기
function renderReviewDropdown() {
  const dropdown = document.getElementById('reviewDropdown');
  dropdown.innerHTML = '';
  reviewList.forEach((r, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `리뷰 ${i+1}`;
    dropdown.appendChild(opt);
  });
  dropdown.value = currentReviewIdx;
}

function renderReviewContent() {
  const contentDiv = document.getElementById('reviewContent');
  if (reviewList.length > 0) {
    contentDiv.textContent = reviewList[currentReviewIdx].content;
  } else {
    contentDiv.textContent = '리뷰 없음';
  }
}

function renderAnswerPreview() {
  const answerDiv = document.getElementById('answerContent');
  if (!activeStyleId || reviewList.length === 0) {
    answerDiv.textContent = '답변 미리보기';
    return;
  }
  // 임시: 스타일명 + 리뷰내용 조합
  const style = styleList.find(s => s.id === activeStyleId);
  const review = reviewList[currentReviewIdx];
  answerDiv.textContent = `[${style.name}] ${review.content} 에 대한 답변 예시`;
}

async function generateAnswerWithActiveStyle() {
  if (isGenerating) return;
  const answerDiv = document.getElementById('answerContent');
  const style = styleList.find(s => s.id === activeStyleId);
  const review = reviewList[currentReviewIdx];
  if (!style || !review) {
    answerDiv.textContent = '답변 미리보기';
    return;
  }
  isGenerating = true;
  answerDiv.innerHTML = '<span class="loading-spinner"></span> 답변 생성 중...';
  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_content: review.content,
        settings: style.settings || {},
        review_type: review.type,
        hospital: selectedHospital,
        answer_length: 'medium', // 필요시 스타일에 따라 변경
        additional_content: '',
        feedback: '',
        last_answer: '',
        review_id: review.id
      })
    });
    const data = await res.json();
    if (data.result) {
      answerDiv.textContent = data.result;
    } else {
      answerDiv.textContent = data.error || '답변 생성 중 오류가 발생했습니다.';
    }
  } catch (e) {
    answerDiv.textContent = '답변 생성 중 오류가 발생했습니다.';
  } finally {
    isGenerating = false;
  }
}

async function loadHospitalReviews(hospital) {
  // 긍정 리뷰
  const posRes = await fetch(`/hospital_reviews?hospital=${encodeURIComponent(hospital)}&type=positive`);
  positiveReviews = (await posRes.json()).reviews || [];
  // 부정 리뷰
  const negRes = await fetch(`/hospital_reviews?hospital=${encodeURIComponent(hospital)}&type=negative`);
  negativeReviews = (await negRes.json()).reviews || [];
  // 기본값: 긍정
  reviewTypeTab = 'positive';
  reviewList = positiveReviews;
  currentReviewIdx = 0;
  renderReviewTab();
  renderReviewSlider();
}

function renderReviewTab() {
  const tabDiv = document.getElementById('reviewTypeTab');
  if (!tabDiv) return;
  tabDiv.innerHTML = '';
  const posBtn = document.createElement('button');
  posBtn.textContent = '긍정 리뷰';
  posBtn.className = 'btn btn--secondary' + (reviewTypeTab === 'positive' ? ' active' : '');
  posBtn.onclick = () => { reviewTypeTab = 'positive'; reviewList = positiveReviews; currentReviewIdx = 0; renderReviewTab(); renderReviewSlider(); };
  const negBtn = document.createElement('button');
  negBtn.textContent = '부정 리뷰';
  negBtn.className = 'btn btn--secondary' + (reviewTypeTab === 'negative' ? ' active' : '');
  negBtn.onclick = () => { reviewTypeTab = 'negative'; reviewList = negativeReviews; currentReviewIdx = 0; renderReviewTab(); renderReviewSlider(); };
  tabDiv.appendChild(posBtn);
  tabDiv.appendChild(negBtn);
}

function renderReviewSlider() {
  const sliderDiv = document.getElementById('reviewSlider');
  if (!sliderDiv) return;
  sliderDiv.innerHTML = '';
  if (reviewList.length === 0) {
    sliderDiv.textContent = '리뷰가 없습니다.';
    return;
  }
  const review = reviewList[currentReviewIdx];
  const card = document.createElement('div');
  card.className = 'review-card';
  card.innerHTML = `<div style="font-size:15px; margin-bottom:8px;">${review.content}</div>
    <div style="color:#888; font-size:13px;">작성자: ${review.author || '-'} | 평점: ${review.score ?? '-'} </div>`;
  sliderDiv.appendChild(card);
  // 슬라이드 네비게이션
  const navDiv = document.createElement('div');
  navDiv.style.marginTop = '8px';
  navDiv.style.textAlign = 'center';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '←';
  prevBtn.onclick = () => { currentReviewIdx = (currentReviewIdx - 1 + reviewList.length) % reviewList.length; renderReviewSlider(); };
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  nextBtn.onclick = () => { currentReviewIdx = (currentReviewIdx + 1) % reviewList.length; renderReviewSlider(); };
  navDiv.appendChild(prevBtn);
  navDiv.appendChild(document.createTextNode(` ${currentReviewIdx+1} / ${reviewList.length} `));
  navDiv.appendChild(nextBtn);
  sliderDiv.appendChild(navDiv);
  // 답변 생성 버튼
  const answerBtn = document.createElement('button');
  answerBtn.textContent = '이 리뷰로 답변 생성';
  answerBtn.className = 'btn btn--primary btn--full-width';
  answerBtn.style.marginTop = '12px';
  answerBtn.onclick = () => generateAnswerWithActiveStyleForReview(review);
  sliderDiv.appendChild(answerBtn);
}

async function generateAnswerWithActiveStyleForReview(review) {
  if (isGenerating) return;
  const answerDiv = document.getElementById('answerContent');
  const style = styleList.find(s => s.id === activeStyleId);
  if (!style || !review) {
    answerDiv.textContent = '답변 미리보기';
    return;
  }
  isGenerating = true;
  answerDiv.innerHTML = '<span class="loading-spinner"></span> 답변 생성 중...';
  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_content: review.content,
        settings: style.settings || {},
        review_type: reviewTypeTab,
        hospital: selectedHospital,
        answer_length: style.answerLength || 'medium',
        additional_content: style.additionalContent || '',
        feedback: style.feedback || '',
        last_answer: style.lastAnswer || '',
        review_id: review.id
      })
    });
    const data = await res.json();
    if (data.result) {
      answerDiv.textContent = data.result;
    } else {
      answerDiv.textContent = data.error || '답변 생성 중 오류가 발생했습니다.';
    }
  } catch (e) {
    answerDiv.textContent = '답변 생성 중 오류가 발생했습니다.';
  } finally {
    isGenerating = false;
  }
}

// 병원 선택 시 리뷰/스타일 모두 불러오기
async function loadHospitalStylesAndReviews(hospital) {
  await loadHospitalStyles(hospital);
  await loadHospitalReviews(hospital);
}

// 초기 데이터 로딩
function initializeMain() {
  console.log('initializeMain 실행');
  renderHospitalSelect();
  loadHospitalStylesAndReviews(selectedHospital);
  const btn = document.getElementById('addStyleBtn');
  console.log('addStyleBtn:', btn);
  if (btn) {
    btn.onclick = async function() {
      const name = prompt('새 스타일 이름을 입력하세요');
      if (name) {
        const newId = 'user_' + Date.now();
        styleList.push({ id: newId, name, active: false, settings: {} });
        await saveHospitalStyles();
        renderStyleList();
      }
    };
  } else {
    alert('addStyleBtn이 DOM에 없습니다! main.html 구조를 확인하세요.');
  }
}

document.addEventListener('DOMContentLoaded', initializeMain);
