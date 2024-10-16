// 서비스 워커 설치 이벤트: 네비게이션 프리로드 활성화 설정
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 새 버전의 서비스 워커를 즉시 활성화하도록 함
});

// 서비스 워커 활성화 이벤트: 클라이언트를 제어하고 네비게이션 프리로드 활성화
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    if ('navigationPreload' in self.registration) {
        self.registration.navigationPreload.enable(); // 네비게이션 프리로드 활성화
    }
});

// fetch 이벤트 리스너 추가: 프리로드 응답을 처리함
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            // 프리로드 응답 대기 및 처리
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse) {
                return preloadResponse; // 프리로드 응답 반환
            }
            // 프리로드 응답이 없을 경우 기본 네트워크 요청 처리
            return fetch(event.request);
        })());
    }
});
