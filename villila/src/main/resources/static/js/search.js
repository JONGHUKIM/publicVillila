document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const selectedFiltersContainer = document.getElementById('selectedFilters');
    const filterButtons = document.querySelectorAll('.category-btn, .brand-btn, .color-circle, .location-btn, .price-btn');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mapButtonSection = document.getElementById('mapButtonSection');
    const priceSearchBtn = document.getElementById('priceSearchBtn');
    const searchResultDiv = document.getElementById('searchResultDiv');
    const urlParams = new URLSearchParams(window.location.search);
    const brand = urlParams.get('brand');

    let selectedFilters = {};
    let latestSearchResults = [];
    let currentPage = 0; // 현재 페이지 번호
    let isLoading = false; // 데이터 로드 중 여부 플래그
    let hasMoreData = true; // 추가 데이터가 있는지 여부

    // 유저 닉네임인지 판별하는 함수
    function isUserNickname(query) {
        const nicknamePattern = /^[a-zA-Z0-9가-힣]{2,20}$/;
        const hasFilter = Object.keys(selectedFilters).length > 0;
        return nicknamePattern.test(query) && !hasFilter;
    }

    // 선택된 필터 표시 업데이트 함수
    function updateSelectedFilters() {
        selectedFiltersContainer.innerHTML = '';

        for (const [type, filterArrays] of Object.entries(selectedFilters)) {
            filterArrays.forEach(filterArray => {
                const filterTag = document.createElement('div');
                filterTag.classList.add('selected-filter');
                filterTag.innerHTML = `
                    <span>${filterArray.value}</span>
                    <button data-type="${type}" data-value="${filterArray.value}" data-source="${filterArray.source}">X</button>
                `;
                selectedFiltersContainer.appendChild(filterTag);
            });
        }

        // 삭제 버튼 동작
        document.querySelectorAll('.selected-filter button').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const value = btn.dataset.value;

                const index = selectedFilters[type].findIndex(item => item.value === value);
                if (index > -1) {
                    selectedFilters[type].splice(index, 1);
                    if (selectedFilters[type].length === 0) {
                        delete selectedFilters[type];
                    }
                    document.querySelector(`[data-filter="${type}"][data-value="${value}"]`)?.classList.remove('selected');
                    updateSelectedFilters();
                    resetAndSearch();
                }
                
                checkCategoryButtonsCleared();
            });
        });
    }

    // 검색 초기화 및 새로 검색
    function resetAndSearch() {
        currentPage = 0;
        hasMoreData = true;
        searchResultDiv.innerHTML = ''; // 결과 초기화
        latestSearchResults = []; // 결과 데이터 초기화
        performSearch();
    }

    // 검색 실행 함수 (무한 스크롤용)
    const performSearch = () => {
        if (isLoading || !hasMoreData) return; // 로드 중이거나 더 이상 데이터가 없으면 중단

        isLoading = true; // 로드 시작
        const query = searchInput.value.trim();
        const isUserSearch = isUserNickname(query);
        const hasFilter = Object.keys(selectedFilters).length > 0;

        let selectFilters = document.querySelectorAll('.selected-filter');

        const filterMap = Array.from(selectFilters).reduce((result, filter) => {
            const button = filter.querySelector('button');
            const type = button.dataset.type;
            const source = button.dataset.source;

            if (!result[type]) {
                result[type] = [];
            }
            result[type].push(source);
            return result;
        }, {});

        const priceMin = document.getElementById("priceMin").value.trim();
        const priceMax = document.getElementById("priceMax").value.trim();

        filterMap.keyword = [searchInput.value.trim()];
        filterMap.page = [currentPage];
        filterMap.size = [6]; // 한 페이지당 6개씩
        console.log("필터 맵:", filterMap);

        axios.post('/api/search', filterMap)
            .then((response) => {
                console.log("✅ 응답:", response.data);
                console.log("📦 content:", response.data.content);
                let html = '';
                if (response.data.totalElements === 0 && currentPage === 0) {
                    html = '<span>검색된 결과가 없습니다!</span>';
					if (mapButtonSection) {
					    mapButtonSection.classList.add('hidden');
					}
                    hasMoreData = false;
                } else {
					if (mapButtonSection) {
					    mapButtonSection.classList.remove('hidden');
					}
                    if (response.data.content.length === 0) {
                        hasMoreData = false; // 더 이상 데이터가 없음
                        return;
                    }
                    response.data.content.forEach(product => {
                        const displayFee = Math.round(product.fee * 1.05); // 5% 수수료 추가
                        html += `
                            <div class="result-item">
                        `;
                        switch (product.rentalCategoryId) {
                            case 1:
                                html += `
                                <a href="/post/details/bag?id=${product.id}">
                                `;
                                break;
                            case 2:
                                html += `
                                <a href="/post/details/car?id=${product.id}">
                                `;
                                break;
                        }
                        html += `
                                    <img src="/images/rentals/${product.filePath}" alt="상품 이미지">
                                </a>
                        `;
                        switch (product.rentalCategoryId) {
                            case 1:
                                html += `
                                <a class="product-content" href="/post/details/bag?id=${product.id}">
                                `;
                                break;
                            case 2:
                                html += `
                                <a class="product-content" href="/post/details/car?id=${product.id}">
                                `;
                                break;
                        }
                        html += `
                                    <p><strong>${product.postName}</strong></p>
                                    <p><strong>${product.fee} JJAM</strong></p>
                                </a>
                            </div>
                        `;
                    });
                    latestSearchResults = latestSearchResults.concat(response.data.content);
                }
                searchResultDiv.insertAdjacentHTML('beforeend', html); // 기존 결과에 추가
                isLoading = false; // 로드 완료
                currentPage++; // 다음 페이지로 이동
            })
            .catch((error) => {
                console.error("❌ 요청 실패:", error);
                if (error.response) {
                    console.log("💥 서버 응답:", error.response.data);
                }
                isLoading = false;
            });
    };

    // 검색 버튼 / 엔터 키 이벤트
    searchBtn.addEventListener('click', (e) => {
        resetAndSearch();
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            resetAndSearch();
        }
    });

    // 가격 validation
    priceSearchBtn.addEventListener('click', () => {
        const minInput = document.getElementById('priceMin');
        const maxInput = document.getElementById('priceMax');

        const min = parseInt(minInput.value, 10);
        const max = parseInt(maxInput.value, 10);

        // 유효성 검사
        if (isNaN(min) || isNaN(max)) {
            alert('숫자를 입력해주세요.');
            return;
        }

        if (min < 0 || max < 0) {
            alert('0원 이상의 금액만 입력 가능합니다.');
            return;
        }

        if (min > max) {
            alert('최소 금액이 최대 금액보다 클 수 없습니다.');
            return;
        }

        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';

        const value = `${min}쨈 ~ ${max}쩸`;
        selectedFilters['price'] = [{ value: value, source: `${min},${max}`}];

        document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('selected'));
        updateSelectedFilters();
        resetAndSearch();
    });

    // 필터 버튼 클릭 이벤트
    filterButtons.forEach(button => {
        button.addEventListener('click', () => handleFilterButtonClick(button));
    });
    
    function handleFilterButtonClick(button) {
        const filterType = button.dataset.filter;
        const filterValue = button.dataset.value;
        const filterSource = button.dataset.source;

        if (!selectedFilters[filterType]) {
            selectedFilters[filterType] = [];
        }

        if (button.classList.contains('price-btn')) {
            const isSelected = button.classList.contains('selected');
    
            // 모두 초기화
            document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('selected'));
            delete selectedFilters['price'];
            document.getElementById('priceMin').value = '';
            document.getElementById('priceMax').value = '';
    
            if (isSelected) {
                // 이미 선택된 버튼을 다시 누르면 해제만 하고 끝
                updateSelectedFilters();
                resetAndSearch();
                return;
            }
    
            // 새로 선택
            button.classList.add('selected');
            selectedFilters['price'] = [{ value: filterValue, source: filterSource }];
            updateSelectedFilters();
            resetAndSearch();
            return;
        }

        const index = selectedFilters[filterType].findIndex(item => item.value === filterValue);

        if (index > -1) {
            selectedFilters[filterType].splice(index, 1);
            button.classList.remove('selected');
            if (selectedFilters[filterType].length === 0) {
                delete selectedFilters[filterType];
            }
        } else {
            if (filterType === 'price') {
                selectedFilters[filterType] = [];
                document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => b.classList.remove('selected'));
            }
            selectedFilters[filterType].push({ value: filterValue, source: filterSource });
            button.classList.add('selected');
        }
        updateSelectedFilters();
        resetAndSearch();
    }
    
    // 카테고리 버튼 누를시 전체 해제 기능 (라디오 버튼 비슷하게)
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const isSelected = btn.classList.contains("selected");
            const filterType = this.dataset.filter;  // 필터 타입 가져오기
            const filterValue = this.dataset.value;  // 필터 값 가져오기
            const filterSource = this.dataset.source;  // 소스 값 가져오기
            console.log(isSelected, filterType, filterValue);
            
            const currentSelected = document.querySelector('.category-btn.selected');
            const isSwitchingCategory = currentSelected && currentSelected !== btn;
            
            if (isSelected) {
                delete selectedFilters[filterType];
                btn.classList.remove("selected");
                checkCategoryButtonsCleared();
                updateSelectedFilters();
                resetAndSearch();
                return;
            }
            
            if (isSwitchingCategory) {
                // 다른 카테고리 버튼이 선택된 상태에서 새로운 버튼 클릭
                const oldCategoryValue = currentSelected.dataset.value;
                const oldCategorySource = currentSelected.dataset.source;
                console.log(`카테고리 전환: ${oldCategoryValue} -> ${filterValue}`);
                currentSelected.classList.remove("selected"); // 기존 선택 해제
                delete selectedFilters[filterType]; // 기존 필터 제거
            }
            
            ['brand', 'color', 'price', 'location'].forEach(filter => {
                if (selectedFilters[filter]) {
                    delete selectedFilters[filter];
                    document.querySelectorAll(`[data-filter="${filter}"]`).forEach(b => b.classList.remove('selected'));
                }
            });

            nonRefreshCategoryFilters();

            console.log("categoryID", filterSource);
            makeBrandColumn(filterSource);
            
            btn.classList.add("selected");
            selectedFilters[filterType] = [{ value: filterValue, source: filterSource }];
            updateSelectedFilters();
            resetAndSearch();
        });
    });
    
    // 모든 필터 초기화
    function refreshFilters() {
        document.querySelectorAll(".category-btn").forEach(b => {
            b.classList.remove("selected");
        });
        document.querySelectorAll(".filter-btn").forEach(b => {
            b.classList.remove("selected");
        });
        document.querySelectorAll("#selectedFilters button").forEach(b => {
            if (b.dataset.type !== "category") b.click();
        });
    }
    
    function nonRefreshCategoryFilters() {
        document.querySelectorAll(".filter-btn").forEach(b => {
            // 카테고리 버튼은 제외
            if (!b.classList.contains("category-btn")) {
                b.classList.remove("selected");
            }
        });
        document.querySelectorAll("#selectedFilters button").forEach(b => {
            if (b.dataset.type !== "category") b.click();
        });
    }

    function checkCategoryButtonsCleared() {
        const anySelected = Array.from(document.querySelectorAll('.category-btn'))
            .some(btn => btn.classList.contains('selected'));
    
        if (!anySelected) {
            console.log("모든 카테고리 버튼이 해제");
            if (!selectedFilters['category']) {
                makeBrandColumn(99);
            }
        }
    }

    function makeBrandColumn(categoryId) {
        axios.post('/api/brand', { rentalCategoryId: categoryId }, {
            headers: { 
                'Content-Type': 'application/json' 
            }
        })
        .then((response) => {
            const brands = response.data;
            console.log(brands);
            const brandDiv = document.getElementById("brandDiv");
            let html = '';
            brandDiv.innerHTML = html;
            
            for (let brand of brands) {
                html += `
                    <button class="filter-btn brand-btn" data-filter="brand" data-value="${brand.name}" 
                    data-source="${brand.id}">${brand.name}</button>
                `;
            }
            brandDiv.innerHTML = html;
            
            document.querySelectorAll('#brandDiv .filter-btn').forEach(btn => {
                btn.removeEventListener('click', handleFilterButtonClick);
                btn.addEventListener('click', () => handleFilterButtonClick(btn));
            });
        })
        .catch((error) => console.log(error));
        
        const params = new URLSearchParams(window.location.search);
        const brandId = String(params.get("brandId"));
        if (brandId) {
            const targetBtn = document.querySelector(`.brand-btn[data-source="${brandId}"]`);
            console.log(targetBtn);
            if (targetBtn) {
                targetBtn.click();
            }
        }
    }

	// 지도 보기 추후 업데이트 예정
	/*
    let map = null;
    let mapInitialized = false;
    // 초기 지도 생성
    document.getElementById("toggleMapBtn").addEventListener("click", () => {
        const mapElement = document.getElementById("map");
        mapElement.classList.toggle("open");
        
        if (mapElement.classList.contains("open")) {
            // 지도가 열린 상태에서만 초기화 및 마커 설정
            if (!mapInitialized) {
                const mapContainer = document.getElementById('map-box');
                const mapOption = {
                    center: new kakao.maps.LatLng(37.5, 126.9), // 기본 중심
                    level: 3
                };
                map = new kakao.maps.Map(mapContainer, mapOption);
                mapInitialized = true;
            }
    
            // 지도 크기 갱신 후 마커 표시
            setTimeout(() => {
                map.relayout(); // 지도 크기 재계산
                makeMarkerMap(latestSearchResults);
            }, 500); // DOM 업데이트 후 실행 보장
        }
    });

    let markers = [];

    function makeMarkerMap(contents) {
        if (!map || !contents || contents.length === 0) return;

        // 기존 마커 제거
        markers.forEach(marker => {
            marker.setMap(null);
        });
        markers = []; // 마커 배열 초기화

        const bounds = new kakao.maps.LatLngBounds();

        contents.forEach(item => {
            console.log(item);
            let baseUrl = 'http://192.168.14.20:8080/post/details/';
            let latlng = new kakao.maps.LatLng(parseFloat(item.latitude), parseFloat(item.longitude));
            let imgSize = new kakao.maps.Size(50, 50);
            let imgSource = `/images/rentals/${item.filePath}`;
            let markerImg = new kakao.maps.MarkerImage(imgSource, imgSize);
            let marker = new kakao.maps.Marker({
                position: latlng,
                clickable: true,
                image: markerImg
            });
            kakao.maps.event.addListener(marker, 'click', function() {
                let url;
                switch (item.rentalCategoryId) {
                    case 1:
                        url = baseUrl + `bag?id=${item.id}`;
                        break;
                    case 2:
                        url = baseUrl + `car?id=${item.id}`;
                        break;
                }
                window.open(url, '_blank');
            });
            marker.setMap(map);

            markers.push(marker); // 새 마커를 배열에 저장
            bounds.extend(latlng);
        });

        map.setBounds(bounds);
    }
	*/
	
    if (brand) {
        const tryClickBrand = () => {
            const brandBtn = document.querySelector(`[data-filter="brand"][data-value="${brand}"]`);
            if (brandBtn) {
                brandBtn.classList.add("selected");
                selectedFilters["brand"] = [{ value: brand, source: brandBtn.dataset.source }];
                updateSelectedFilters();
                resetAndSearch();
            } else {
                setTimeout(tryClickBrand, 200);
            }
        };
        tryClickBrand();
    }

    // 스크롤 이벤트 감지
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100 && !isLoading) {
            performSearch();
        }
    });

    // 초기화 버튼
    document.getElementById("refresh-btn").addEventListener("click", function () {
        searchInput.value = '';
        refreshFilters();
        selectedFilters = {};
        updateSelectedFilters();
        resetAndSearch();
    });

    // 초기 검색 실행
    performSearch();
    makeBrandColumn(99); // 초기 브랜드 그려주기
});