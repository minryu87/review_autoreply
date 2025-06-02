// 애플리케이션 데이터
const appData = {
  positive_settings: [
    {"id": 1, "label": "시작 인사 표현", "options": ["정중한 시작 인사", "간략한 인사", "인사 생략"]},
    {"id": 2, "label": "고객 호칭 및 이름 언급", "options": ["적극적 호명", "간접적 호명", "호칭 생략"]},
    {"id": 3, "label": "리뷰 감사 강조", "options": ["적극 강조", "일반적 표현", "생략"]},
    {"id": 4, "label": "감사 표현 강도", "options": ["강한 표현", "일반 표현", "절제된 표현"]},
    {"id": 5, "label": "공감 및 친밀 어조", "options": ["감정적 공감 표현", "절제된 공감 표현", "공감 표현 생략"]},
    {"id": 6, "label": "이모티콘 활용", "options": ["적극 활용 😊🙏🙌", "제한적 활용 🙂", "사용 안 함"]},
    {"id": 7, "label": "답변 상세도", "options": ["상세형", "간략형", "최소형"]},
    {"id": 8, "label": "추가 의견 대응", "options": ["적극적 대응", "간략 대응", "대응 없음"]},
    {"id": 9, "label": "추가 안내 제공", "options": ["적극적 안내", "제한적 안내", "추가 안내 없음"]},
    {"id": 10, "label": "재방문 유도 멘트", "options": ["적극적 유도", "소극적 유도", "유도 멘트 없음"]},
    {"id": 11, "label": "마무리 인사 및 맺음말", "options": ["적극적 맺음말", "공식적 맺음말", "맺음말 없음"]},
    {"id": 12, "label": "답변 문체", "options": ["친근형", "격식형", "혼합형"]}
  ],
  negative_settings: [
    {"id": 1, "label": "인사말", "options": ["정중한 개인 인사", "일반적 인사", "간단한 인사"]},
    {"id": 2, "label": "피드백 감사", "options": ["적극적 감사 표현", "일반적 감사 표현", "간단한 감사 표현"]},
    {"id": 3, "label": "피드백 중요성", "options": ["높은 중요성 강조", "일반적 중요성 언급", "간단한 언급"]},
    {"id": 4, "label": "사과 표현", "options": ["진심어린 사과", "일반적 사과", "간단한 사과"]},
    {"id": 5, "label": "공감 표현", "options": ["적극적 공감", "절제된 공감", "간단한 공감"]},
    {"id": 6, "label": "책임/태도 표현", "options": ["적극적 책임 인정", "일반적 태도 표현", "간단한 태도 표현"]},
    {"id": 7, "label": "원인 설명", "options": ["구체적 설명", "일반적 설명", "간단한 언급"]},
    {"id": 8, "label": "개선 조치", "options": ["구체적 개선 계획", "일반적 개선 언급", "간단한 개선 언급"]},
    {"id": 9, "label": "소통 제안", "options": ["적극적 소통 제안", "일반적 소통 제안", "간단한 연락 안내"]},
    {"id": 10, "label": "재방문 권유", "options": ["적극적 재방문 권유", "소극적 재방문 권유", "간단한 권유"]},
    {"id": 11, "label": "마무리 표현", "options": ["감사 중심 마무리", "사과 중심 마무리", "발전 다짐 마무리"]},
    {"id": 12, "label": "맺음말", "options": ["감사 인사", "정중한 인사", "건강 인사"]}
  ],
  sample_reviews: [
    {"id": "positive1", "type": "positive", "content": "의사선생님이 친절하게 설명해주셔서 좋았습니다. 간호사분들도 모두 친절하고 병원이 깨끗해서 만족합니다. 다음에도 방문할 예정입니다!"},
    {"id": "positive2", "type": "positive", "content": "진료를 받기까지 대기시간이 짧았고, 검사 결과도 빠르게 나와서 좋았습니다. 의료진 분들이 모두 전문적이면서도 따뜻하게 대해주셔서 감사했습니다."},
    {"id": "negative1", "type": "negative", "content": "접수할 때 직원이 불친절했고, 대기시간이 너무 길었습니다. 예약 시간보다 1시간 이상 기다렸는데 별다른 안내도 없어서 불편했습니다."},
    {"id": "negative2", "type": "negative", "content": "진료비가 다른 병원보다 비싸다고 느꼈고, 의사 선생님이 설명을 대충 하시는 것 같아서 아쉬웠습니다. 추가 검사도 꼭 필요한지 의문이 들었습니다."}
  ],
  api_config: {
    api_key: "AIzaSyDVh8FKTFmKN4bXl3eDW08J8r59rFIzsuA",
    model: "gemini-2.5-pro-preview-05-06"
  }
};

// DOM 요소들
let reviewTypeSelect, positiveSettingsDiv, negativeSettingsDiv, sampleReviewSelect, reviewTextDiv, generateBtn, loadingIndicator, responseTextDiv;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  setupEventListeners();
  renderSettings();
  renderSampleReviews();
  updateUI();
});

function initializeElements() {
  reviewTypeSelect = document.getElementById('reviewType');
  positiveSettingsDiv = document.getElementById('positiveSettings');
  negativeSettingsDiv = document.getElementById('negativeSettings');
  sampleReviewSelect = document.getElementById('sampleReview');
  reviewTextDiv = document.getElementById('reviewText');
  generateBtn = document.getElementById('generateBtn');
  loadingIndicator = document.getElementById('loadingIndicator');
  responseTextDiv = document.getElementById('responseText');
}

function setupEventListeners() {
  reviewTypeSelect.addEventListener('change', handleReviewTypeChange);
  sampleReviewSelect.addEventListener('change', handleSampleReviewChange);
  generateBtn.addEventListener('click', handleGenerateResponse);
}

function renderSettings() {
  renderPositiveSettings();
  renderNegativeSettings();
}

function renderPositiveSettings() {
  const container = positiveSettingsDiv.querySelector('.settings-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
  appData.positive_settings.forEach(setting => {
    const settingDiv = createSettingElement(setting, 'positive');
    container.appendChild(settingDiv);
  });
}

function renderNegativeSettings() {
  const container = negativeSettingsDiv.querySelector('.settings-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
  appData.negative_settings.forEach(setting => {
    const settingDiv = createSettingElement(setting, 'negative');
    container.appendChild(settingDiv);
  });
}

function createSettingElement(setting, type) {
  const div = document.createElement('div');
  div.className = 'setting-item';
  
  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = setting.label;
  label.setAttribute('for', `${type}_setting_${setting.id}`);
  
  const select = document.createElement('select');
  select.className = 'form-control';
  select.id = `${type}_setting_${setting.id}`;
  
  setting.options.forEach((option, index) => {
    const optionElement = document.createElement('option');
    optionElement.value = index;
    optionElement.textContent = option;
    if (index === 0) optionElement.selected = true;
    select.appendChild(optionElement);
  });
  
  div.appendChild(label);
  div.appendChild(select);
  
  return div;
}

function renderSampleReviews() {
  if (!sampleReviewSelect) return;
  
  sampleReviewSelect.innerHTML = '<option value="">리뷰를 선택해주세요</option>';
  
  const currentType = reviewTypeSelect.value;
  const filteredReviews = appData.sample_reviews.filter(review => review.type === currentType);
  
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
  if (!reviewTypeSelect || !positiveSettingsDiv || !negativeSettingsDiv) return;
  
  const reviewType = reviewTypeSelect.value;
  
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
  
  const selectedReview = appData.sample_reviews.find(review => review.id === selectedReviewId);
  if (selectedReview) {
    reviewTextDiv.textContent = selectedReview.content;
  } else {
    reviewTextDiv.textContent = '리뷰를 찾을 수 없습니다.';
  }
}

function getSelectedSettings() {
  const reviewType = reviewTypeSelect.value;
  const settings = {};
  
  const settingsData = reviewType === 'positive' ? appData.positive_settings : appData.negative_settings;
  
  settingsData.forEach(setting => {
    const selectElement = document.getElementById(`${reviewType}_setting_${setting.id}`);
    if (selectElement) {
      const selectedIndex = parseInt(selectElement.value);
      settings[setting.label] = setting.options[selectedIndex];
    }
  });
  
  return settings;
}

function generatePrompt(reviewContent, settings, reviewType) {
  const settingsText = Object.entries(settings)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
  
  const prompt = `다음은 병원 리뷰에 대한 답변을 작성하는 작업입니다.

리뷰 내용:
"${reviewContent}"

답변 설정 (${reviewType === 'positive' ? '긍정' : '부정'} 리뷰):
${settingsText}

위 설정을 모두 반영하여 전문적이고 적절한 병원 리뷰 답변을 작성해주세요. 답변은 자연스럽고 진정성 있게 작성하되, 설정된 모든 요소들을 적절히 포함시켜 주세요. 한국어로 작성해주세요.`;

  return prompt;
}

async function callGeminiAPI(prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appData.api_config.model}:generateContent?key=${appData.api_config.api_key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error('API 응답에서 답변을 찾을 수 없습니다.');
  }
}

async function handleGenerateResponse() {
  if (!sampleReviewSelect || !generateBtn || !loadingIndicator || !responseTextDiv) return;
  
  const selectedReviewId = sampleReviewSelect.value;
  if (!selectedReviewId) {
    alert('먼저 리뷰를 선택해주세요.');
    return;
  }
  
  const selectedReview = appData.sample_reviews.find(review => review.id === selectedReviewId);
  if (!selectedReview) {
    alert('선택된 리뷰를 찾을 수 없습니다.');
    return;
  }
  
  const reviewType = reviewTypeSelect.value;
  if (selectedReview.type !== reviewType) {
    alert('선택된 리뷰 타입과 설정 타입이 일치하지 않습니다.');
    return;
  }
  
  const settings = getSelectedSettings();
  const prompt = generatePrompt(selectedReview.content, settings, reviewType);
  
  // UI 업데이트
  generateBtn.disabled = true;
  generateBtn.textContent = '생성 중...';
  loadingIndicator.classList.remove('hidden');
  responseTextDiv.textContent = '';
  
  try {
    const response = await callGeminiAPI(prompt);
    responseTextDiv.textContent = response;
  } catch (error) {
    console.error('답변 생성 중 오류 발생:', error);
    responseTextDiv.textContent = `답변 생성 중 오류가 발생했습니다:\n${error.message}\n\n네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '답변 생성';
    loadingIndicator.classList.add('hidden');
  }
}
