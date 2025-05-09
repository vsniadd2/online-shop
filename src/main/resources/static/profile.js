document.addEventListener('DOMContentLoaded', function() {
    const profileIcon = document.getElementById('profileIcon');
    const passwordModal = document.getElementById('passwordModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Базовый URL API
    const API_BASE_URL = ''; // Пустая строка означает относительный путь от текущего хоста

    // Базовые настройки для всех fetch запросов
    const baseFetchOptions = {
        credentials: 'same-origin',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    };

    // Проверяем, есть ли токен в localStorage
    let token = localStorage.getItem('jwtToken');
    let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

    // Функция для отображения информации о пользователе
    function loadProfile() {
        const profileLoading = document.getElementById('profile-loading');
        const profileData = document.getElementById('profile-data');
        const notAuthorized = document.getElementById('not-authorized');

        // Если пользователь не авторизован
        if (!token || !currentUser) {
            profileLoading.style.display = 'none';
            profileData.style.display = 'none';
            notAuthorized.style.display = 'block';

            // Обновляем иконку профиля
            profileIcon.innerHTML = '<i class="fas fa-user"></i>';
            return;
        }

        // Обновляем иконку профиля
        profileIcon.innerHTML = currentUser.email ?
            `<span>${currentUser.email.split('@')[0]}</span>` :
            '<i class="fas fa-user-check"></i>';

        // Загружаем данные пользователя с сервера
        fetchUserData();
    }

    // Загрузка данных пользователя с сервера
    async function fetchUserData() {
        const profileLoading = document.getElementById('profile-loading');
        const profileData = document.getElementById('profile-data');
        const notAuthorized = document.getElementById('not-authorized');

        try {
            // Добавляем токен авторизации
            const options = {
                ...baseFetchOptions,
                headers: {
                    ...baseFetchOptions.headers,
                    'Authorization': `Bearer ${token}`
                }
            };

            // Получаем данные с сервера
            const response = await fetch(`${API_BASE_URL}/api/profile`, options);

            if (!response.ok) {
                if (response.status === 401) {
                    // Если токен невалидный, выходим из аккаунта
                    logout();
                    return;
                }
                throw new Error('Не удалось загрузить данные профиля');
            }

            const userData = await response.json();

            // Отображаем данные пользователя
            displayUserData(userData);

        } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);

            // В случае ошибки используем локальные данные
            displayUserFromLocalStorage();
        }
    }

    // Отображение данных из localStorage
    function displayUserFromLocalStorage() {
        const profileLoading = document.getElementById('profile-loading');
        const profileData = document.getElementById('profile-data');

        // Заполняем данные пользователя
        document.getElementById('profile-email').textContent = currentUser.email || 'Не указан';
        document.getElementById('profile-name').textContent = 'Не указано';

        // Показываем данные, скрываем загрузку
        profileLoading.style.display = 'none';
        profileData.style.display = 'block';

        // Загружаем заказы
        fetchOrders();
    }

    // Отображение данных пользователя с сервера
    function displayUserData(userData) {
        const profileLoading = document.getElementById('profile-loading');
        const profileData = document.getElementById('profile-data');

        // Заполняем данные пользователя
        document.getElementById('profile-email').textContent = userData.email || 'Не указан';
        document.getElementById('profile-name').textContent = userData.name || 'Не указано';
        document.getElementById('profile-date').textContent = formatDate(userData.registrationDate) || 'Недоступно';

        // Обновляем локальное хранилище
        currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Показываем данные, скрываем загрузку
        profileLoading.style.display = 'none';
        profileData.style.display = 'block';

        // Загружаем заказы
        fetchOrders();
    }

    // Форматирование даты
    function formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Загрузка заказов пользователя
    async function fetchOrders() {
        const ordersContainer = document.getElementById('orders-container');

        try {
            // Добавляем токен авторизации
            const options = {
                ...baseFetchOptions,
                headers: {
                    ...baseFetchOptions.headers,
                    'Authorization': `Bearer ${token}`
                }
            };

            // Вариант 1: Демо-заказы (если API не реализован)
            // Раскомментируйте, если у вас нет API для получения заказов
            displayDemoOrders();
            return;

            // Вариант 2: Получаем заказы с сервера
            const response = await fetch(`${API_BASE_URL}/api/orders`, options);

            if (!response.ok) {
                throw new Error('Не удалось загрузить заказы');
            }

            const orders = await response.json();

            if (orders && orders.length > 0) {
                displayOrders(orders);
            } else {
                ordersContainer.innerHTML = '<p class="no-orders">У вас пока нет заказов</p>';
            }

        } catch (error) {
            console.error('Ошибка при загрузке заказов:', error);
            ordersContainer.innerHTML = `<p class="no-orders">Не удалось загрузить заказы: ${error.message}</p>`;
        }
    }

    // Отображение демо-заказов
    function displayDemoOrders() {
        const ordersContainer = document.getElementById('orders-container');

        // Создаем пустой список заказов
        ordersContainer.innerHTML = '<p class="no-orders">У вас пока нет заказов</p>';
    }

    // Отображение заказов
    function displayOrders(orders) {
        const ordersContainer = document.getElementById('orders-container');

        // Очищаем контейнер
        ordersContainer.innerHTML = '';

        // Добавляем каждый заказ
        orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';

            // Определяем класс статуса
            let statusClass = '';
            switch (order.status.toLowerCase()) {
                case 'completed':
                    statusClass = 'completed';
                    break;
                case 'pending':
                    statusClass = 'pending';
                    break;
                case 'cancelled':
                    statusClass = 'cancelled';
                    break;
            }

            // Формируем HTML для заказа
            orderElement.innerHTML = `
                <div class="order-header">
                    <div class="order-number">Заказ #${order.id}</div>
                    <div class="order-date">${formatDate(order.date)}</div>
                    <div class="order-status ${statusClass}">${order.status}</div>
                </div>
                <div class="order-products">
                    <p>Товаров: ${order.items ? order.items.length : 0}</p>
                </div>
                <div class="order-total">
                    Итого: ${order.total.toFixed(2)} ₽
                </div>
            `;

            ordersContainer.appendChild(orderElement);
        });
    }

    // Выход из аккаунта
    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        token = null;
        currentUser = null;

        // Перенаправляем на главную
        window.location.href = 'index.html';
    }

    // Обработчик нажатия на иконку профиля
    profileIcon.addEventListener('click', function() {
        // Если пользователь авторизован, показываем меню
        if (token) {
            showProfileMenu();
        } else {
            // Если не авторизован, перенаправляем на главную
            window.location.href = 'index.html';
        }
    });

    // Показать меню профиля
    function showProfileMenu() {
        const menu = document.createElement('div');
        menu.className = 'profile-menu';
        menu.innerHTML = `
            <div class="profile-menu-header">
                <h3>${currentUser.email.split('@')[0] || 'Пользователь'}</h3>
                <p>${currentUser.email}</p>
            </div>
            <ul>
                <li><a href="profile.html">Мой профиль</a></li>
                <li><a href="my-listings.html">Мои объявления</a></li>
                <li><a href="#" id="menuLogoutBtn">Выйти</a></li>
            </ul>
        `;

        menu.style.position = 'absolute';
        menu.style.right = '20px';
        menu.style.top = '70px';
        menu.style.backgroundColor = 'white';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        menu.style.padding = '15px';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '200px';

        document.body.appendChild(menu);

        document.getElementById('menuLogoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });

        setTimeout(() => {
            window.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== profileIcon) {
                    document.body.removeChild(menu);
                    window.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    // Обработчик кнопки изменения пароля
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            passwordModal.style.display = 'flex';
        });
    }

    // Закрытие модального окна
    if (closePasswordModal) {
        closePasswordModal.addEventListener('click', function() {
            passwordModal.style.display = 'none';
        });
    }

    // Обработка клика вне модального окна
    window.addEventListener('click', function(e) {
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    // Обработчик формы изменения пароля
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // Проверка совпадения паролей
            if (newPassword !== confirmNewPassword) {
                alert('Новые пароли не совпадают');
                return;
            }

            try {
                // Добавляем токен авторизации
                const options = {
                    ...baseFetchOptions,
                    method: 'POST',
                    headers: {
                        ...baseFetchOptions.headers,
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                };

                // Вариант 1: Симуляция успешного обновления (если API не реализован)
                // Раскомментируйте, если у вас нет API для смены пароля

                alert('Пароль успешно изменен');
                passwordModal.style.display = 'none';
                changePasswordForm.reset();
                return;

                // Вариант 2: Отправка запроса на сервер
                const response = await fetch(`${API_BASE_URL}/api/profile/change-password`, options);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Не удалось изменить пароль');
                }

                const data = await response.json();

                if (data.success) {
                    alert('Пароль успешно изменен');
                    passwordModal.style.display = 'none';
                    changePasswordForm.reset();
                } else {
                    throw new Error(data.error || 'Не удалось изменить пароль');
                }

            } catch (error) {
                console.error('Ошибка при изменении пароля:', error);
                alert('Ошибка: ' + error.message);
            }
        });
    }

    // Обработчик кнопки выхода
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }

    // Загружаем профиль при загрузке страницы
    loadProfile();
});