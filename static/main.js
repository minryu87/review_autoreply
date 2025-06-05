// 메인화면: 병원 선택, 스타일 목록, 리뷰/답변 미리보기, 스타일 상세 연동

let hospitalList = ["솔동물의료센터", "원진치과의원", "수지미래산부인과"];
let selectedHospital = hospitalList[0];

// 긍정/부정 각각의 상태
let positive = {
  styleList: [],
  activeStyleId: null,
  reviewList: [],
  currentReviewIdx: 0
};
let negative = {
  styleList: [],
  activeStyleId: null,
  reviewList: [],
  currentReviewIdx: 0
};

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
    loadAllData(selectedHospital);
  };
  container.appendChild(select);
}

function renderStyleList(type) {
  const listDiv = document.getElementById(type === 'positive' ? 'positiveStyleList' : 'negativeStyleList');
  listDiv.innerHTML = '';
  const state = type === 'positive' ? positive : negative;
  state.styleList.forEach(style => {
    const item = document.createElement('div');
    item.className = 'style-item' + (state.activeStyleId === style.id ? ' active' : '');

    const name = document.createElement('span');
    name.className = 'style-name';
    name.textContent = style.name;
    item.appendChild(name);

    // ON/OFF 버튼
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = state.activeStyleId === style.id ? 'ON' : 'OFF';
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      state.activeStyleId = style.id;
      renderStyleList(type);
      renderReviewSlider(type);
      renderAnswerPreview(type);
    };
    item.appendChild(toggleBtn);

    // '수정' 버튼
    const editBtn = document.createElement('button');
    editBtn.textContent = '수정';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      const styleName = encodeURIComponent(style.name);
      const reviewType = type;
      const hospital = encodeURIComponent(selectedHospital);
      window.location.href = `/style_detail/${style.id}?hospital=${hospital}&styleName=${styleName}&reviewType=${reviewType}`;
    };
    item.appendChild(editBtn);

    // '이름 수정' 버튼
    const renameBtn = document.createElement('button');
    renameBtn.textContent = '이름 수정';
    renameBtn.onclick = async (e) => {
      e.stopPropagation();
      const newName = prompt('새 스타일 이름을 입력하세요', style.name);
      if (newName && newName !== style.name) {
        style.name = newName;
        await saveAllStyles();
        renderStyleList(type);
      }
    };
    item.appendChild(renameBtn);

    // 삭제 버튼
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '삭제';
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm('정말 이 스타일을 삭제하시겠습니까?')) {
        state.styleList = state.styleList.filter(s => s.id !== style.id);
        await saveAllStyles();
        renderStyleList(type);
      }
    };
    item.appendChild(removeBtn);

    item.onclick = () => {
      state.activeStyleId = style.id;
      renderStyleList(type);
      renderReviewSlider(type);
      renderAnswerPreview(type);
    };
    listDiv.appendChild(item);
  });
}

function renderReviewSlider(type) {
  const sliderDiv = document.getElementById(type === 'positive' ? 'positiveReviewSlider' : 'negativeReviewSlider');
  sliderDiv.innerHTML = '';
  const state = type === 'positive' ? positive : negative;
  if (state.reviewList.length === 0) {
    sliderDiv.textContent = '리뷰가 없습니다.';
    return;
  }
  const review = state.reviewList[state.currentReviewIdx];
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
  prevBtn.onclick = () => { state.currentReviewIdx = (state.currentReviewIdx - 1 + state.reviewList.length) % state.reviewList.length; renderReviewSlider(type); };
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  nextBtn.onclick = () => { state.currentReviewIdx = (state.currentReviewIdx + 1) % state.reviewList.length; renderReviewSlider(type); };
  navDiv.appendChild(prevBtn);
  navDiv.appendChild(document.createTextNode(` ${state.currentReviewIdx+1} / ${state.reviewList.length} `));
  navDiv.appendChild(nextBtn);
  sliderDiv.appendChild(navDiv);
  // 답변 생성 버튼
  const answerBtn = document.createElement('button');
  answerBtn.textContent = '이 리뷰로 답변 생성';
  answerBtn.className = 'btn btn--primary btn--full-width';
  answerBtn.style.marginTop = '12px';
  answerBtn.onclick = () => generateAnswerWithActiveStyleForReview(type, review);
  sliderDiv.appendChild(answerBtn);
}

function renderAnswerPreview(type) {
  const answerDiv = document.getElementById(type === 'positive' ? 'positiveAnswerContent' : 'negativeAnswerContent');
  const state = type === 'positive' ? positive : negative;
  if (!state.activeStyleId || state.reviewList.length === 0) {
    answerDiv.textContent = '답변 미리보기';
    return;
  }
  const style = state.styleList.find(s => s.id === state.activeStyleId);
  const review = state.reviewList[state.currentReviewIdx];
  answerDiv.textContent = `[${style.name}] ${review.content} 에 대한 답변 예시`;
}

async function generateAnswerWithActiveStyleForReview(type, review) {
  const answerDiv = document.getElementById(type === 'positive' ? 'positiveAnswerContent' : 'negativeAnswerContent');
  const state = type === 'positive' ? positive : negative;
  const style = state.styleList.find(s => s.id === state.activeStyleId);
  if (!style || !review) {
    answerDiv.textContent = '답변 미리보기';
    return;
  }
  // 진단용 로그
  console.log('답변 생성용 스타일:', style);
  console.log('settings:', style.settings);

  // settings가 비어있으면, 스타일의 type별 속성에서 settings를 찾아본다
  let settings = style.settings;
  if (!settings || Object.keys(settings).length === 0) {
    if (type === 'positive' && style.positive && style.positive.settings) {
      settings = style.positive.settings;
    } else if (type === 'negative' && style.negative && style.negative.settings) {
      settings = style.negative.settings;
    }
  }
  if (!settings) settings = {};

  answerDiv.innerHTML = '<span class="loading-spinner"></span> 답변 생성 중...';
  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_content: review.content,
        settings: settings,
        review_type: type,
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
  }
}

async function loadStyles(type) {
  const res = await fetch(`/hospital_styles?hospital=${encodeURIComponent(selectedHospital)}&review_type=${type}`);
  if (res.ok) {
    const data = await res.json();
    const list = (data.styles || []).map(s => ({...s, ...s[type]}));
    if (type === 'positive') positive.styleList = list;
    else negative.styleList = list;
  }
}

async function loadReviews(type) {
  const res = await fetch(`/hospital_reviews?hospital=${encodeURIComponent(selectedHospital)}&type=${type}`);
  if (res.ok) {
    const data = await res.json();
    if (type === 'positive') positive.reviewList = data.reviews || [];
    else negative.reviewList = data.reviews || [];
  }
}

async function loadAllData(hospital) {
  await Promise.all([
    loadStyles('positive'),
    loadStyles('negative'),
    loadReviews('positive'),
    loadReviews('negative')
  ]);
  // 초기 선택
  if (positive.styleList.length > 0) positive.activeStyleId = positive.styleList[0].id;
  if (negative.styleList.length > 0) negative.activeStyleId = negative.styleList[0].id;
  positive.currentReviewIdx = 0;
  negative.currentReviewIdx = 0;
  renderStyleList('positive');
  renderStyleList('negative');
  renderReviewSlider('positive');
  renderReviewSlider('negative');
  renderAnswerPreview('positive');
  renderAnswerPreview('negative');
}

function setupAddStyleBtns() {
  document.getElementById('addPositiveStyleBtn').onclick = async function() {
    const name = prompt('새 긍정 스타일 이름을 입력하세요');
    if (name) {
      const newId = 'user_' + Date.now();
      positive.styleList.push({ id: newId, name, active: false, settings: {} });
      await saveAllStyles();
      renderStyleList('positive');
    }
  };
  document.getElementById('addNegativeStyleBtn').onclick = async function() {
    const name = prompt('새 부정 스타일 이름을 입력하세요');
    if (name) {
      const newId = 'user_' + Date.now();
      negative.styleList.push({ id: newId, name, active: false, settings: {} });
      await saveAllStyles();
      renderStyleList('negative');
    }
  };
}

async function saveAllStyles() {
  // 병원 전체 스타일을 긍정/부정 합쳐서 저장
  const styles = [];
  positive.styleList.forEach(s => {
    styles.push({
      id: s.id,
      name: s.name,
      active: s.active,
      positive: {
        settings: s.settings || {},
        answerLength: s.answerLength || 'medium',
        additionalContent: s.additionalContent || '',
        feedback: s.feedback || '',
        lastAnswer: s.lastAnswer || ''
      },
      negative: {}
    });
  });
  negative.styleList.forEach(s => {
    // 이미 styles에 id/name이 있으면 negative만 채움
    let found = styles.find(st => st.id === s.id && st.name === s.name);
    if (found) {
      found.negative = {
        settings: s.settings || {},
        answerLength: s.answerLength || 'medium',
        additionalContent: s.additionalContent || '',
        feedback: s.feedback || '',
        lastAnswer: s.lastAnswer || ''
      };
    } else {
      styles.push({
        id: s.id,
        name: s.name,
        active: s.active,
        positive: {},
        negative: {
          settings: s.settings || {},
          answerLength: s.answerLength || 'medium',
          additionalContent: s.additionalContent || '',
          feedback: s.feedback || '',
          lastAnswer: s.lastAnswer || ''
        }
      });
    }
  });
  await fetch('/hospital_styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital: selectedHospital, styles })
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHospitalSelect();
  loadAllData(selectedHospital);
  setupAddStyleBtns();
});
