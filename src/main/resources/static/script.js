document.addEventListener('DOMContentLoaded', function() {
    const productsContainer = document.getElementById('products-container');
    const profileIcon = document.getElementById('profileIcon');
    const authModal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Базовый URL API, измените при необходимости
    const API_BASE_URL = ''; // Пустая строка означает относительный путь от текущего хоста
    // Если ваш API работает на другом порту, раскомментируйте следующую строку и укажите правильный URL
    // const API_BASE_URL = 'http://localhost:8080';

    // Включить режим отладки
    const DEBUG = true;

    // Определение браузера для отладки различий
    const isBrowserFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    const isBrowserChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

    console.log("Браузер:", isBrowserFirefox ? "Firefox" : (isBrowserChrome ? "Chrome" : "Другой"));

    // Базовые настройки для всех fetch запросов
    const baseFetchOptions = {
        // По умолчанию не включаем credentials
        credentials: 'same-origin',
        // Chrome иногда требует явного указания режима CORS
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            // Предотвращение кэширования
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    };

    // Вспомогательная функция для логирования запросов API
    function logApiRequest(endpoint, method, body, response) {
        if (!DEBUG) return;

        console.group(`API запрос: ${method} ${endpoint}`);
        console.log('Браузер:', isBrowserFirefox ? "Firefox" : (isBrowserChrome ? "Chrome" : "Другой"));
        if (body) console.log('Отправлено:', body);
        if (response) {
            console.log('Статус:', response.status);
            console.log('Заголовки:', response.headers);

            // Проверяем CORS заголовки для отладки
            const corsHeadersPresent = response.headers.get('access-control-allow-origin') !== null;
            console.log('CORS заголовки присутствуют:', corsHeadersPresent);
        }
        console.groupEnd();
    }

    // Проверяем, есть ли токен в localStorage
    let token = localStorage.getItem('jwtToken');
    let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

    // Обновляем UI в зависимости от статуса авторизации
    updateAuthUI();

    // Обработчик нажатия на иконку профиля
    profileIcon.addEventListener('click', function(e) {
        e.stopPropagation(); // Предотвращаем всплытие события

        const profileMenu = document.getElementById('profileMenu');
        const profileName = document.querySelector('.profile-name');
        const menuName = document.querySelector('.profile-menu-name');
        const menuEmail = document.querySelector('.profile-menu-email');

        // Если пользователь авторизован
        if (token && currentUser) {
            // Обновляем информацию в меню
            menuName.textContent = currentUser.name || currentUser.email.split('@')[0];
            menuEmail.textContent = currentUser.email;

            // Переключаем видимость меню
            profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
        } else {
            // Если не авторизован, показываем окно авторизации
            authModal.style.display = 'flex';
        }
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', function(e) {
        const profileMenu = document.getElementById('profileMenu');
        const profileIconElement = document.getElementById('profileIcon');

        if (profileMenu && profileMenu.style.display === 'block' &&
            !profileIconElement.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
    });

    // Обработчик кнопки выхода
    const menuLogoutBtn = document.getElementById('menuLogoutBtn');
    if (menuLogoutBtn) {
        menuLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('currentUser');
            token = null;
            currentUser = null;
            updateAuthUI();
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu) {
                profileMenu.style.display = 'none';
            }
            alert('Вы вышли из аккаунта');
        });
    }

    // Обновление UI при авторизации
    function updateAuthUI() {
        const profileName = document.querySelector('.profile-name');
        const profileIcon = document.getElementById('profileIcon');

        if (token && currentUser) {
            // Показываем имя пользователя
            profileName.textContent = currentUser.name || currentUser.email.split('@')[0];
            profileName.style.display = 'inline';
            profileIcon.querySelector('i').style.display = 'none';
        } else {
            // Скрываем имя и показываем иконку
            profileName.style.display = 'none';
            profileIcon.querySelector('i').style.display = 'inline';
        }
    }

    // Вызываем обновление UI при загрузке страницы
    updateAuthUI();

    // Закрытие модального окна
    closeBtn.addEventListener('click', function() {
        authModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    // Переключение между вкладками
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок и контента
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Добавляем активный класс выбранной кнопке
            btn.classList.add('active');

            // Показываем соответствующий контент
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Обработка формы входа
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                ...baseFetchOptions,
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            logApiRequest('/api/login', 'POST', { email }, response);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка авторизации');
            }

            const data = await response.json();
            console.log('Ответ сервера на авторизацию:', data);

            if (!data.success) {
                throw new Error(data.error || 'Ошибка авторизации');
            }

            token = data.token;
            currentUser = data.user;
            localStorage.setItem('jwtToken', token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            authModal.style.display = 'none';
            alert('Вы успешно авторизованы!');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка авторизации: ' + error.message);
        }
    });

    // Обработка формы регистрации
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/registration`, {
                ...baseFetchOptions,
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            logApiRequest('/api/registration', 'POST', { name, email }, response);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка регистрации');
            }

            const data = await response.json();
            console.log('Ответ сервера на регистрацию:', data);

            if (!data.success) {
                throw new Error(data.error || 'Ошибка регистрации');
            }

            // После успешной регистрации выполним вход автоматически
            await loginUser(email, password);

            authModal.style.display = 'none';
            alert('Регистрация прошла успешно! Вы авторизованы.');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка при регистрации: ' + error.message);
        }
    });

    // Вспомогательная функция для входа после регистрации
    async function loginUser(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                ...baseFetchOptions,
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                console.error('Ошибка автоматического входа после регистрации');
                return false;
            }

            const data = await response.json();

            if (!data.success) {
                console.error('Ошибка автоматического входа после регистрации:', data.error);
                return false;
            }

            token = data.token;
            currentUser = data.user;
            localStorage.setItem('jwtToken', token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            return true;
        } catch (error) {
            console.error('Ошибка автоматического входа:', error);
            return false;
        }
    }

    // Глобальная переменная для хранения товаров
    let productsData = [];

    // Функция для загрузки товаров с сервера
    async function loadProducts() {
        productsContainer.innerHTML = '<div class="loading">Загрузка товаров...</div>';

        try {
            const endpoint = '/api/products';
            console.log(`Отправка запроса на: ${API_BASE_URL}${endpoint}`);
            console.log('User-Agent:', navigator.userAgent);

            try {
                const timestamp = new Date().getTime();
                const url = `${API_BASE_URL}${endpoint}?_=${timestamp}`;

                console.log('Запрос с настройками:', baseFetchOptions);
                const response = await fetch(url, baseFetchOptions);

                logApiRequest(endpoint, 'GET', null, response);

                if (response.status === 204) {
                    console.log('Сервер вернул 204 No Content - нет товаров');
                    productsContainer.innerHTML = '<div class="error">Товары не найдены</div>';
                    return;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Ошибка API:', errorText);
                    throw new Error(`Не удалось загрузить товары. Статус: ${response.status}`);
                }

                const products = await response.json();
                console.log('Получены данные:', products);

                if (!products || products.length === 0) {
                    productsContainer.innerHTML = '<div class="error">Товары не найдены</div>';
                    return;
                }

                // Сохраняем данные о товарах
                productsData = products;
                renderProducts(products);
            } catch (apiError) {
                console.error('Ошибка API:', apiError);

                if (apiError.name === 'TypeError' && apiError.message.includes('Failed to fetch')) {
                    console.error('Возможная причина: CORS ошибка или сервер недоступен');

                    // Для Chrome добавляем специальное сообщение
                    if (isBrowserChrome) {
                        console.warn('Chrome часто строже к CORS настройкам, чем Firefox. Проверьте настройки CORS в Spring Boot.');
                    }
                }

                console.log('Использую тестовые данные из-за ошибки API');

                // Используем тестовые данные, если API не отвечает
                const testProducts = [];

                // Создаем тестовые товары
                for (let i = 1; i <= 20; i++) {
                    testProducts.push({
                        id: i,
                        title: `Товар ${i}`,
                        description: `Подробное описание товара ${i}. Здесь может быть ваш текст с характеристиками товара.`,
                        price: i * 100,
                        city: ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Екатеринбург"][Math.floor(Math.random() * 5)]
                    });
                }

                renderProducts(testProducts);

                // Добавляем разное сообщение для Firefox и Chrome
                const browserInfo = isBrowserChrome
                    ? " Chrome часто строже к CORS настройкам, чем Firefox."
                    : "";

                productsContainer.insertAdjacentHTML('beforeend',
                    `<div class="api-error-notice">
                        Примечание: отображаются тестовые данные, так как API недоступен.
                        <br>Ошибка: ${apiError.message}${browserInfo}
                    </div>`);
            }
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            productsContainer.innerHTML = `<div class="error">Произошла ошибка: ${error.message}</div>`;
        }
    }

    // Функция для отображения товаров
    function renderProducts(products) {
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-grid';

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.style.cursor = 'pointer';

            // Добавляем обработчик клика для перехода на страницу деталей
            productCard.onclick = function() {
                window.location.href = `product-details.html?id=${product.id}`;
            };

            productCard.innerHTML = `
                <div class="product-image">
                    <img src="/api/products/image/${product.id}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">${product.price.toFixed(2)}</div>
                    <div class="product-city">${product.city || 'Не указан'}</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Добавить в корзину
                    </button>
                </div>
            `;

            productsGrid.appendChild(productCard);
        });

        productsContainer.innerHTML = '';
        productsContainer.appendChild(productsGrid);

        // Выводим отладочную информацию
        console.log(`Отрисовано ${products.length} товаров в grid-layout`);
    }

    // Функция для добавления товара в корзину
    function addToCart(product) {
        if (!token) {
            authModal.style.display = 'flex';
            alert('Для добавления товаров в корзину необходимо авторизоваться');
            return;
        }

        // Здесь должен быть запрос к вашему API корзины
        // В данном примере вызов закомментирован, так как в предоставленном бэкенде нет эндпоинта для корзины

        /*
        fetch(`${API_BASE_URL}/api/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: product.id })
        })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка добавления в корзину');
            return response.json();
        })
        .then(data => {
            alert(`Товар "${product.title}" добавлен в корзину!`);
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при добавлении в корзину');
        });
        */

        // Временное сообщение, пока API корзины не реализовано
        console.log(`Добавление в корзину: ${product.id} - ${product.title || product.name}`);
        alert(`Товар "${product.title || product.name}" добавлен в корзину!`);
    }

    // Загружаем товары при загрузке страницы
    loadProducts();

    // Проверка соединения с сервером
    checkServerConnection();

    // Функция для проверки соединения с сервером
    async function checkServerConnection() {
        try {
            console.log('Проверка соединения с сервером...');

            // Здесь мы используем fetch с другими настройками, чтобы изолировать проблему
            const timestamp = new Date().getTime();
            const testFetchOptions = {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit', // Не отправляем куки
                cache: 'no-store',  // Полностью отключаем кэширование
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache, no-store',
                    'Pragma': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Test-Connection': 'true'
                }
            };

            // Проверка соединения
            let connectionResult = {
                server: 'Недоступен',
                cors: 'Не проверено',
                details: 'Не удалось подключиться к серверу'
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/products?_test=${timestamp}`, testFetchOptions);
                connectionResult.server = 'Доступен';
                connectionResult.cors = response.headers.get('access-control-allow-origin') ? 'Настроен' : 'Проблема';
                connectionResult.details = `Статус: ${response.status}`;
            } catch (e) {
                connectionResult.details = e.message;
            }

            console.log('Результат проверки соединения:', connectionResult);

            // Если мы в Chrome и есть проблема с сервером
            if (isBrowserChrome && connectionResult.server !== 'Доступен') {
                console.warn('В Chrome обнаружены проблемы с подключением к серверу');
            }

        } catch (error) {
            console.error('Ошибка при проверке соединения:', error);
        }
    }

    // Поиск
    const searchToggle = document.querySelector('.search-toggle');
    const searchInputWrapper = document.querySelector('.search-input-wrapper');
    const searchInput = document.querySelector('.search-input');

    searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInputWrapper.classList.toggle('active');
        if (searchInputWrapper.classList.contains('active')) {
            searchInput.focus();
        }
    });

    // Закрытие поиска при клике вне
    document.addEventListener('click', (e) => {
        if (!searchInputWrapper.contains(e.target) && !searchToggle.contains(e.target)) {
            searchInputWrapper.classList.remove('active');
        }
    });

    // Обработка поиска
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const products = document.querySelectorAll('.product-card');

        products.forEach(product => {
            const title = product.querySelector('.product-title').textContent.toLowerCase();
            const description = product.querySelector('.product-description').textContent.toLowerCase();

            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                product.style.display = '';
                product.style.animation = 'fadeIn 0.3s ease';
            } else {
                product.style.display = 'none';
            }
        });
    });

    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Функция для сортировки товаров
    function sortProducts(sortBy) {
        if (!productsData || productsData.length === 0) return;

        // Сортируем данные
        const sortedProducts = [...productsData].sort((a, b) => {
            switch(sortBy) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'city-asc':
                    return (a.city || '').localeCompare(b.city || '');
                case 'city-desc':
                    return (b.city || '').localeCompare(a.city || '');
                default:
                    return 0;
            }
        });

        // Обновляем отображение
        renderProducts(sortedProducts);

        // Обновляем активный класс на кнопках
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.sort === sortBy) {
                btn.classList.add('active');
            }
        });
    }

    // Обработчики для сортировки
    document.addEventListener('DOMContentLoaded', () => {
        const sortButtons = document.querySelectorAll('.sort-btn');

        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const currentSort = button.dataset.sort;
                const isAscending = currentSort.endsWith('-asc');

                // Переключаем направление сортировки
                const newSort = isAscending ?
                    currentSort.replace('-asc', '-desc') :
                    currentSort.replace('-desc', '-asc');

                // Обновляем data-sort атрибут
                button.dataset.sort = newSort;

                // Обновляем иконку
                const icon = button.querySelector('i');
                if (currentSort.startsWith('price')) {
                    icon.className = isAscending ?
                        'fas fa-sort-amount-up' :
                        'fas fa-sort-amount-down';
                } else if (currentSort.startsWith('city')) {
                    icon.className = isAscending ?
                        'fas fa-map-marker-alt fa-flip-horizontal' :
                        'fas fa-map-marker-alt';
                }

                // Применяем сортировку
                sortProducts(newSort);
            });
        });
    });
});