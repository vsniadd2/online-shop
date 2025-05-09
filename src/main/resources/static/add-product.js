document.addEventListener('DOMContentLoaded', function() {
    const profileIcon = document.getElementById('profileIcon');
    const addProductForm = document.getElementById('add-product-form');
    const authRequired = document.getElementById('auth-required');
    const successMessage = document.getElementById('success-message');
    const addAnotherBtn = document.getElementById('add-another-btn');
    const citySelect = document.getElementById('city');
    const otherCityGroup = document.getElementById('other-city-group');
    const otherCityInput = document.getElementById('other-city');
    const productImage = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');


    const API_BASE_URL = '';


    const baseFetchOptions = {
        credentials: 'same-origin',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    };

    productImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.style.display = 'block';
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
    });

    let token = localStorage.getItem('jwtToken');
    let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

    function checkAuth() {
        if (!token || !currentUser) {
            addProductForm.style.display = 'none';
            authRequired.style.display = 'block';

            profileIcon.innerHTML = '<i class="fas fa-user"></i>';
            return false;
        }

        profileIcon.innerHTML = currentUser.email ?
            `<span>${currentUser.email.split('@')[0]}</span>` :
            '<i class="fas fa-user-check"></i>';

        return true;
    }

    citySelect.addEventListener('change', function() {
        if (this.value === 'Другой') {
            otherCityGroup.style.display = 'block';
            otherCityInput.setAttribute('required', true);
        } else {
            otherCityGroup.style.display = 'none';
            otherCityInput.removeAttribute('required');
        }
    });

    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!checkAuth()) {
            return;
        }

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('price', document.getElementById('price').value);

        let city = citySelect.value;
        if (city === 'Другой') {
            city = otherCityInput.value;
        }
        formData.append('city', city);

        const imageFile = productImage.files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {

            const response = await fetch(`${API_BASE_URL}/api/products/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при добавлении товара');
            }

            const data = await response.json();
            console.log('Ответ сервера:', data);


            addProductForm.style.display = 'none';
            successMessage.style.display = 'block';

        } catch (error) {
            console.error('Ошибка при добавлении товара:', error);
            alert('Произошла ошибка при добавлении товара: ' + error.message);
        }
    });

    addAnotherBtn.addEventListener('click', function() {
        // Скрываем сообщение об успехе
        successMessage.style.display = 'none';

        // Очищаем форму и показываем ее
        addProductForm.reset();
        otherCityGroup.style.display = 'none';
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
        addProductForm.style.display = 'block';
    });

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

    // Выход из аккаунта
    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        token = null;
        currentUser = null;

        // Перенаправляем на главную
        window.location.href = 'index.html';
    }

    // Проверяем авторизацию при загрузке страницы
    checkAuth();
});