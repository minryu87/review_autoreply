// 서버에서 설정 및 샘플 리뷰를 받아옴
let appData = {};
let reviewType = 'positive'; // 전역 선언
let reviewTypeDisplay, positiveSettingsDiv, negativeSettingsDiv, sampleReviewSelect, reviewTextDiv, generateBtn, loadingIndicator, responseTextDiv;
let answerLengthSelect, additionalContentInput, feedbackInput, regenerateBtn;
let lastGeneratedAnswer = '';
let lastReviewId = '';
let selectedHospital = '';
let sampleReviews = [];
let styleName = '';

// 리뷰 타입 표시용 변수 추가

// 슬라이더 생성 함수
function createSliderElement(setting, type) {
  const div = document.createElement('div');
  div.className = 'setting-item';

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = setting.label;
  label.setAttribute('for', `${type}_setting_${setting.id}`);

  // 슬라이더
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'form-range custom-slider';
  slider.id = `${type}_setting_${setting.id}`;
  slider.min = 0;
  slider.max = setting.options.length - 1;
  slider.value = 0;
  slider.step = 1;
  slider.style.width = '100%';
  slider.style.margin = '0';
  // 핸들이 눈금 중앙에 오도록 padding 추가
  slider.style.padding = '0 ' + (100/(setting.options.length*2)) + '%';

  // 눈금 및 예시
  const marks = document.createElement('div');
  marks.className = 'slider-marks';
  marks.style.display = 'flex';
  marks.style.justifyContent = 'space-between';
  marks.style.marginTop = '4px';
  marks.style.position = 'relative';

  setting.options.forEach((option, idx) => {
    const mark = document.createElement('div');
    mark.style.textAlign = 'center';
    mark.style.flex = '1';
    mark.style.minWidth = '60px';
    mark.innerHTML = `<b>${option}</b><br><span style='color:#888'>${setting.examples[idx]}</span>`;
    marks.appendChild(mark);
  });
  marks.style.height = '40px';

  div.appendChild(label);
  div.appendChild(marks); // marks 먼저
  div.appendChild(slider); // slider 나중에 (z-index로 겹칠 수 있음)
  return div;
}

// 설정 렌더링
function renderSettings() {
  renderPositiveSettings();
  renderNegativeSettings();
  updateSettingsVisibility();
}

function renderPositiveSettings() {
  const container = positiveSettingsDiv.querySelector('.settings-grid');
  if (!container) return;
  container.innerHTML = '';
  appData.positive_settings.forEach(setting => {
    const settingDiv = createSliderElement(setting, 'positive');
    container.appendChild(settingDiv);
  });
}

function renderNegativeSettings() {
  const container = negativeSettingsDiv.querySelector('.settings-grid');
  if (!container) return;
  container.innerHTML = '';
  appData.negative_settings.forEach(setting => {
    const settingDiv = createSliderElement(setting, 'negative');
    container.appendChild(settingDiv);
  });
}

function renderSampleReviews() {
  if (!sampleReviewSelect) return;
  sampleReviewSelect.innerHTML = '<option value="">리뷰를 선택해주세요</option>';
  const filteredReviews = appData.sample_reviews ? appData.sample_reviews.filter(review => review.type === reviewType) : [];
  filteredReviews.forEach((review, index) => {
    const option = document.createElement('option');
    option.value = review.id;
    option.textContent = `${review.type === 'positive' ? '긍정' : '부정'} 리뷰 ${index + 1}`;
    sampleReviewSelect.appendChild(option);
  });
}

function handleReviewTypeChange() {
  updateUI();
}

function updateUI() {
  updateSettingsVisibility();
  updateSampleReviews();
  clearReviewDisplay();
  clearResponse();
}

function updateSettingsVisibility() {
  if (!positiveSettingsDiv || !negativeSettingsDiv) return;
  if (reviewType === 'positive') {
    positiveSettingsDiv.classList.remove('hidden');
    negativeSettingsDiv.classList.add('hidden');
  } else {
    positiveSettingsDiv.classList.add('hidden');
    negativeSettingsDiv.classList.remove('hidden');
  }
}

function updateSampleReviews() {
  renderSampleReviews();
}

function clearReviewDisplay() {
  if (reviewTextDiv) {
    reviewTextDiv.textContent = '리뷰를 선택해주세요.';
  }
}

function clearResponse() {
  if (responseTextDiv) {
    responseTextDiv.textContent = '위 설정을 조정하고 "답변 생성" 버튼을 클릭하여 AI 답변을 생성해보세요.';
  }
}

function handleSampleReviewChange() {
  if (!sampleReviewSelect || !reviewTextDiv) return;
  const selectedReviewId = sampleReviewSelect.value;
  if (!selectedReviewId) {
    reviewTextDiv.textContent = '리뷰를 선택해주세요.';
    return;
  }
  // sampleReviews에서 찾기
  const selectedReview = sampleReviews.find(review => review.id === selectedReviewId);
  if (selectedReview) {
    reviewTextDiv.textContent = selectedReview.content;
  } else {
    reviewTextDiv.textContent = '리뷰를 찾을 수 없습니다.';
  }
}

function getSelectedSettings() {
  const settings = {};
  const settingsData = reviewType === 'positive' ? appData.positive_settings : appData.negative_settings;
  settingsData.forEach(setting => {
    const sliderElement = document.getElementById(`${reviewType}_setting_${setting.id}`);
    if (sliderElement) {
      const selectedIndex = parseInt(sliderElement.value);
      settings[setting.label] = setting.options[selectedIndex];
    }
  });
  return settings;
}

async function handleGenerateResponse(isRegenerate = false) {
  if (!sampleReviewSelect || !generateBtn || !loadingIndicator || !responseTextDiv) return;
  const selectedReviewId = sampleReviewSelect.value;
  if (!selectedReviewId) {
    alert('먼저 리뷰를 선택해주세요.');
    return;
  }
  // sampleReviews에서 찾기
  const selectedReview = sampleReviews.find(review => review.id === selectedReviewId);
  if (!selectedReview) {
    alert('선택된 리뷰를 찾을 수 없습니다.');
    return;
  }
  if (selectedReview.type && selectedReview.type !== reviewType) {
    alert('선택된 리뷰 타입과 설정 타입이 일치하지 않습니다.');
    return;
  }
  const settings = getSelectedSettings();
  const hospital = selectedHospital;
  const answerLength = answerLengthSelect.value;
  const additionalContent = additionalContentInput.value;
  // 누적 피드백(placeholder)과 입력 피드백을 합쳐서 전송
  let feedback = feedbackInput.value.trim();
  let feedbackHistory = feedbackInput.placeholder.replace(/^이 병원 누적 피드백: /, '').replace(/\s*\/\s*/g, '\n').trim();
  if (feedback && feedbackHistory) {
    // 중복 없이 합치기
    const all = (feedback + '\n' + feedbackHistory).split(/\n+/).map(s => s.trim()).filter(Boolean);
    feedback = Array.from(new Set(all)).join('\n');
  } else if (feedbackHistory) {
    feedback = feedbackHistory;
  }
  // UI 업데이트
  generateBtn.disabled = true;
  generateBtn.textContent = '생성 중...';
  loadingIndicator.classList.remove('hidden');
  responseTextDiv.textContent = '';
  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_content: selectedReview.content,
        settings: settings,
        review_type: reviewType,
        hospital: hospital,
        answer_length: answerLength,
        additional_content: additionalContent,
        feedback: isRegenerate ? feedback : feedback,
        last_answer: isRegenerate ? lastGeneratedAnswer : '',
        review_id: selectedReview.id
      })
    });
    const data = await response.json();
    if (data.result) {
      responseTextDiv.textContent = data.result;
      lastGeneratedAnswer = data.result;
      lastReviewId = selectedReview.id;
      // [추가] generation_event 기록
      await fetch('/log_generation_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: window.sessionStorage.getItem('session_id') || '',
          hospital: hospital,
          page_type: 'detail',
          style_name: styleName,
          settings: settings,
          review_type: reviewType
        })
      });
    } else {
      responseTextDiv.textContent = data.error || '답변 생성 중 오류가 발생했습니다.';
    }
  } catch (error) {
    responseTextDiv.textContent = `답변 생성 중 오류가 발생했습니다:\n${error.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '답변 생성';
    loadingIndicator.classList.add('hidden');
  }
}

// 병원별 옵션/피드백 불러오기
async function loadHospitalData(hospital) {
  const res = await fetch(`/hospital_data?hospital=${encodeURIComponent(hospital)}`);
  if (res.ok) {
    const data = await res.json();
    // 옵션/피드백/답변/피드백 히스토리 불러오기
    // 1. 옵션값을 슬라이더에 반영
    if (data.options) {
      const settingsData = reviewType === 'positive' ? appData.positive_settings : appData.negative_settings;
      settingsData.forEach(setting => {
        const slider = document.getElementById(`${reviewType}_setting_${setting.id}`);
        if (slider && data.options[setting.label]) {
          const idx = setting.options.indexOf(data.options[setting.label]);
          if (idx >= 0) slider.value = idx;
        }
      });
    }
    // 2. 피드백 입력란에 반영
    if (data.feedback) {
      feedbackInput.value = data.feedback;
    } else {
      feedbackInput.value = '';
    }
    // 3. 답변 입력란에 반영
    if (data.answer) {
      responseTextDiv.textContent = data.answer;
    } else {
      responseTextDiv.textContent = '';
    }
    // 4. 피드백 히스토리(누적 피드백)는 별도 표시(예: placeholder)
    if (data.feedback_history) {
      feedbackInput.placeholder = `이 병원 누적 피드백: ${data.feedback_history.replace(/\n/g, ' / ')}`;
    } else {
      feedbackInput.placeholder = '';
    }
  }
}

// 병원명/스타일명 쿼리 파싱 및 표시
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || '';
}

// 초기화
async function initializeApp() {
  reviewTypeDisplay = document.getElementById('reviewTypeDisplay');
  positiveSettingsDiv = document.getElementById('positiveSettings');
  negativeSettingsDiv = document.getElementById('negativeSettings');
  sampleReviewSelect = document.getElementById('sampleReview');
  reviewTextDiv = document.getElementById('reviewText');
  generateBtn = document.getElementById('generateBtn');
  loadingIndicator = document.getElementById('loadingIndicator');
  responseTextDiv = document.getElementById('responseText');
  answerLengthSelect = document.getElementById('answerLength');
  additionalContentInput = document.getElementById('additionalContent');
  feedbackInput = document.getElementById('feedbackInput');
  regenerateBtn = document.getElementById('regenerateBtn');

  // 병원명/스타일명 표시 및 변수 저장
  const hospital = getQueryParam('hospital');
  styleName = getQueryParam('styleName');
  reviewType = getQueryParam('reviewType') || 'positive';
  if (hospital) {
    document.getElementById('selectedHospitalName').textContent = hospital;
    selectedHospital = hospital;
  }
  if (styleName) document.getElementById('selectedStyleName').textContent = styleName;
  if (reviewTypeDisplay) reviewTypeDisplay.textContent = reviewType === 'positive' ? '긍정 리뷰' : '부정 리뷰';

  // 서버에서 설정 데이터 받아오기
  const res = await fetch('/settings');
  appData = await res.json();

  setupEventListeners();
  renderSettings();
  renderSampleReviews();
  updateUI();

  // 스타일 settings 및 기타 값 불러와서 UI에 반영
  if (hospital && styleName) {
    const stylesRes = await fetch(`/hospital_styles?hospital=${encodeURIComponent(hospital)}&review_type=${reviewType}`);
    if (stylesRes.ok) {
      const data = await stylesRes.json();
      const style = (data.styles || []).find(s => s.name === styleName);
      if (style && style[reviewType]) {
        const typeObj = style[reviewType];
        const settingsData = reviewType === 'positive' ? appData.positive_settings : appData.negative_settings;
        if (typeObj.settings) {
          settingsData.forEach(setting => {
            const slider = document.getElementById(`${reviewType}_setting_${setting.id}`);
            if (slider && typeObj.settings[setting.label]) {
              const idx = setting.options.indexOf(typeObj.settings[setting.label]);
              if (idx >= 0) slider.value = idx;
            }
          });
        }
        if (typeObj.answerLength && answerLengthSelect) answerLengthSelect.value = typeObj.answerLength;
        if (typeObj.additionalContent && additionalContentInput) additionalContentInput.value = typeObj.additionalContent;
        if (typeObj.feedback && feedbackInput) feedbackInput.value = typeObj.feedback;
        if (typeObj.lastAnswer && responseTextDiv) responseTextDiv.textContent = typeObj.lastAnswer;
      }
    }
  }

  // 병원명 파라미터가 있으면 loadSampleReviews 호출 추가
  if (hospital) {
    await loadSampleReviews(hospital, reviewType);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 병원명/스타일명 표시
  const hospital = getQueryParam('hospital');
  const styleName = getQueryParam('styleName');
  if (hospital) document.getElementById('selectedHospitalName').textContent = hospital;
  if (styleName) document.getElementById('selectedStyleName').textContent = styleName;
  // 기존 초기화 실행
  initializeApp();
});

function setupEventListeners() {
  reviewTypeDisplay.addEventListener('change', handleReviewTypeChange);
  sampleReviewSelect.addEventListener('change', handleSampleReviewChange);
  generateBtn.addEventListener('click', () => handleGenerateResponse(false));
  regenerateBtn.addEventListener('click', () => handleGenerateResponse(true));
  // 저장 버튼 이벤트 리스너 추가
  const saveStyleBtn = document.getElementById('saveStyleBtn');
  if (saveStyleBtn) {
    saveStyleBtn.addEventListener('click', handleSaveStyle);
  }
}

async function handleSaveStyle() {
  const settings = getSelectedSettings();
  const answerLength = answerLengthSelect.value;
  const additionalContent = additionalContentInput.value;
  const feedback = feedbackInput.value;
  const lastAnswer = responseTextDiv.textContent;
  const hospital = getQueryParam('hospital');
  const styleName = getQueryParam('styleName');
  if (!hospital || !styleName) {
    alert('병원명과 스타일명이 필요합니다.');
    return;
  }
  let styles = [];
  try {
    const res = await fetch(`/hospital_styles?hospital=${encodeURIComponent(hospital)}`);
    if (res.ok) {
      const data = await res.json();
      styles = data.styles || [];
    }
  } catch (e) {}
  let found = false;
  for (let s of styles) {
    if (s.name === styleName) {
      if (!s[reviewType]) s[reviewType] = {};
      s[reviewType] = {
        settings,
        answerLength,
        additionalContent,
        feedback,
        lastAnswer
      };
      found = true;
      break;
    }
  }
  if (!found) {
    const newStyle = {
      id: styleName,
      name: styleName,
      active: false,
      positive: {},
      negative: {}
    };
    newStyle[reviewType] = {
      settings,
      answerLength,
      additionalContent,
      feedback,
      lastAnswer
    };
    styles.push(newStyle);
  }
  const res2 = await fetch('/hospital_styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital, styles })
  });
  if (res2.ok) {
    alert('스타일이 저장되었습니다.');
  } else {
    alert('저장에 실패했습니다.');
  }
}

// 샘플 리뷰가 없는 경우 가상의 리뷰를 제공
const DEFAULT_SAMPLE_REVIEWS = {
  positive: [
    { id: 'default_pos_1', type: 'positive', content: '의사 선생님이 친절하게 설명해주셔서 좋았습니다. 병원이 깨끗해서 만족합니다.' },
    { id: 'default_pos_2', type: 'positive', content: '진료를 받기까지 대기시간이 짧았고, 의료진 분들이 모두 전문적이었습니다.' }
  ],
  negative: [
    { id: 'default_neg_1', type: 'negative', content: '직원이 불친절했고, 대기시간이 너무 길었습니다.' },
    { id: 'default_neg_2', type: 'negative', content: '진료비가 비싸고, 설명이 부족했습니다.' }
  ]
};

async function loadSampleReviews(hospital, reviewType) {
  // 실제 리뷰 불러오기
  const res = await fetch(`/hospital_reviews?hospital=${encodeURIComponent(hospital)}&type=${reviewType}`);
  let reviews = [];
  if (res.ok) {
    const data = await res.json();
    reviews = data.reviews || [];
  }
  // 샘플 리뷰가 없으면 가상의 리뷰 제공
  if (!reviews || reviews.length === 0) {
    reviews = DEFAULT_SAMPLE_REVIEWS[reviewType] || [];
  }
  sampleReviews = reviews; // 전역에 저장
  const sampleReviewSelect = document.getElementById('sampleReview');
  sampleReviewSelect.innerHTML = '';
  reviews.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.content.slice(0, 40) + (r.content.length > 40 ? '...' : '');
    sampleReviewSelect.appendChild(opt);
  });
}
