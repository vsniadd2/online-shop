document.addEventListener('DOMContentLoaded', function() {
    const profileIcon = document.getElementById('profileIcon');
    const authModal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Базовый URL API
    const API_BASE_URL = ''; // Пустая строка означает относительный путь от текущего хоста

    // Проверяем, есть ли токен в localStorage
    let token = localStorage.getItem('jwtToken');
    let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

    // Получаем ID товара из URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    // Загружаем информацию о товаре
    loadProductDetails();

    async function loadProductDetails() {
        const container = document.getElementById('product-details');
        const mainImage = document.getElementById('mainImage');
        const thumbnailContainer = document.getElementById('thumbnailContainer');
        const productTitle = document.getElementById('productTitle');
        const productPrice = document.getElementById('productPrice');
        const productMeta = document.getElementById('productMeta');
        const productDescription = document.getElementById('productDescription');
        const sellerAvatar = document.getElementById('sellerAvatar');
        const sellerName = document.getElementById('sellerName');
        const sellerRating = document.getElementById('sellerRating');

        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);

            if (!response.ok) {
                throw new Error('Товар не найден');
            }

            const product = await response.json();

            // Форматируем дату
            const dateCreated = new Date(product.dateOfCreated).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Устанавливаем основное изображение
            mainImage.src = `/api/products/image/${product.id}`;
            mainImage.alt = product.title;

            // Очищаем контейнер миниатюр
            thumbnailContainer.innerHTML = '';

            // Добавляем миниатюру (в данном случае она одна)
            const thumbnail = document.createElement('img');
            thumbnail.src = `/api/products/image/${product.id}`;
            thumbnail.alt = product.title;
            thumbnail.className = 'thumbnail active';
            thumbnail.onclick = () => {
                mainImage.src = thumbnail.src;
                document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
                thumbnail.classList.add('active');
            };
            thumbnailContainer.appendChild(thumbnail);

            // Заполняем информацию о товаре
            productTitle.textContent = product.title;
            productPrice.textContent = `$${product.price.toFixed(2)}`;
            productDescription.textContent = product.description;

            // Добавляем мета-информацию
            productMeta.innerHTML = `
                <div class="meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    ${product.city}
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    ${dateCreated}
                </div>
            `;

            // Информация о продавце
            sellerAvatar.textContent = product.seller?.email?.[0] || '?';
            sellerName.textContent = product.seller?.email || 'Не указан';
            sellerRating.innerHTML = `
                <i class="fas fa-star"></i>
                <span>${product.seller?.rating || '0.0'}</span>
            `;

        } catch (error) {
            container.innerHTML = `
                <div class="error">
                    <p>Ошибка при загрузке товара: ${error.message}</p>
                    <a href="index.html" class="back-btn">Вернуться на главную</a>
                </div>
            `;
        }
    }

    // Функция добавления в корзину
    window.addToCart = async function(productId) {
        if (!token) {
            authModal.style.display = 'flex';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: 1
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при добавлении в корзину');
            }

            alert('Товар успешно добавлен в корзину!');

        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };

    // Обработчики для модального окна авторизации
    profileIcon.addEventListener('click', function() {
        if (token) {
            showProfileMenu();
        } else {
            authModal.style.display = 'flex';
        }
    });

    closeBtn.addEventListener('click', function() {
        authModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    // Переключение вкладок в модальном окне
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
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

    // Выход из аккаунта
    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        token = null;
        currentUser = null;
        window.location.href = 'index.html';
    }

    function displayProductDetails(product) {
        document.getElementById('productTitle').textContent = product.title;
        document.getElementById('productPrice').textContent = product.price.toFixed(2);
        document.getElementById('productDescription').textContent = product.description;
        document.getElementById('productCity').textContent = product.city || 'Не указан';
        document.getElementById('productDate').textContent = new Date(product.createdAt).toLocaleDateString();

        // Обновляем изображение
        const productImage = document.getElementById('productImage');
        productImage.src = `/api/products/image/${product.id}`;
        productImage.alt = product.title;
    }
});