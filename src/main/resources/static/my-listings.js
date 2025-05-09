document.addEventListener('DOMContentLoaded', () => {
    const listingsGrid = document.getElementById('listings-grid');
    const listingsLoading = document.getElementById('listings-loading');
    const listingsData = document.getElementById('listings-data');
    const noListings = document.getElementById('no-listings');
    const notAuthorized = document.getElementById('not-authorized');
    const statusFilter = document.getElementById('statusFilter');
    const sortOrder = document.getElementById('sortOrder');
    const refreshBtn = document.getElementById('refreshListings');
    const editModal = document.getElementById('editModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editForm = document.getElementById('editListingForm');
    const editImages = document.getElementById('editImages');
    const currentImages = document.getElementById('currentImages');
    const confirmModal = document.getElementById('confirmModal');
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');
    const cancelEdit = document.getElementById('cancelEdit');

    let currentListingId = null;
    let listings = [];
    let isLoading = false;

    // Проверяем наличие всех необходимых элементов
    console.log('Элементы страницы:', {
        listingsGrid: listingsGrid ? 'найден' : 'не найден',
        listingsLoading: listingsLoading ? 'найден' : 'не найден',
        listingsData: listingsData ? 'найден' : 'не найден',
        noListings: noListings ? 'найден' : 'не найден',
        notAuthorized: notAuthorized ? 'найден' : 'не найден'
    });

    // Функция для форматирования цены
    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    // Функция для форматирования даты
    const formatDate = (dateString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    };

    // Функция для проверки авторизации
    function checkAuth() {
        const token = localStorage.getItem('jwtToken');
        console.log('Токен авторизации:', token ? 'присутствует' : 'отсутствует');
        if (!token) {
            notAuthorized.style.display = 'block';
            listingsData.style.display = 'none';
            listingsLoading.style.display = 'none';
            return false;
        }
        return true;
    }

    // Функция для отображения состояния загрузки
    function showLoading() {
        isLoading = true;
        listingsLoading.style.display = 'block';
        listingsData.style.display = 'none';
        noListings.style.display = 'none';
        notAuthorized.style.display = 'none';
    }

    // Функция для скрытия состояния загрузки
    function hideLoading() {
        isLoading = false;
        listingsLoading.style.display = 'none';
    }

    // Функция для отображения ошибки
    function showError(message) {
        listingsGrid.innerHTML = `<div class="error">${message}</div>`;
        hideLoading();
    }

    // Загрузка объявлений
    async function loadListings() {
        if (isLoading) {
            console.log('Загрузка уже выполняется');
            return;
        }

        try {
            console.log('Начало загрузки объявлений');
            if (!checkAuth()) {
                console.log('Пользователь не авторизован');
                return;
            }

            showLoading();
            noListings.style.display = 'none';
            notAuthorized.style.display = 'none';
            listingsData.style.display = 'none';

            const sort = sortOrder.value;

            const url = new URL('/api/user/products', window.location.origin);
            url.searchParams.append('sort', sort);

            console.log('Запрос к API:', url.toString());

            const token = localStorage.getItem('jwtToken');
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Статус ответа:', response.status);

            if (response.status === 401) {
                console.log('Ошибка авторизации (401)');
                localStorage.removeItem('jwtToken');
                notAuthorized.style.display = 'block';
                hideLoading();
                return;
            }

            if (response.status === 204) {
                console.log('Нет объявлений (204 No Content)');
                noListings.style.display = 'block';
                hideLoading();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка API:', errorText);
                throw new Error('Не удалось загрузить объявления');
            }

            const data = await response.json();
            console.log('Полученные данные:', data);

            if (!data || data.length === 0) {
                console.log('Нет объявлений');
                noListings.style.display = 'block';
                hideLoading();
                return;
            }

            // Сохраняем оригинальные данные
            listings = data;
            localStorage.setItem('cachedListings', JSON.stringify(data));

            // Применяем текущий фильтр
            applyFilters();

        } catch (error) {
            console.error('Ошибка при загрузке объявлений:', error);
            showError('Ошибка при загрузке объявлений');
        } finally {
            hideLoading();
        }
    }

    // Функция для применения фильтров и сортировки
    function applyFilters() {
        let filteredListings = [...listings];

        // Применяем фильтр по статусу
        const status = statusFilter.value;
        if (status !== 'all') {
            filteredListings = filteredListings.filter(listing => {
                // Проверяем статус активности из поля status
                const isActive = listing.status === 'active';
                return status === 'active' ? isActive : !isActive;
            });
        }

        // Применяем сортировку
        const sort = sortOrder.value;
        switch (sort) {
            case 'newest':
                filteredListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filteredListings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'price-asc':
                filteredListings.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filteredListings.sort((a, b) => b.price - a.price);
                break;
        }

        // Отрисовываем отфильтрованные и отсортированные данные
        renderListings(filteredListings);
    }

    // Отрисовка объявлений
    function renderListings(listingsToRender) {
        if (!listingsToRender || listingsToRender.length === 0) {
            noListings.style.display = 'block';
            listingsData.style.display = 'none';
            return;
        }

        listingsData.style.display = 'block';
        noListings.style.display = 'none';

        // Очищаем текущее содержимое
        listingsGrid.innerHTML = '';

        // Добавляем каждую карточку
        listingsToRender.forEach((listing, index) => {
            const card = document.createElement('div');
            card.className = 'listing-card';
            card.style.animationDelay = `${index * 0.1}s`;

            // Проверяем статус активности из поля status
            const isActive = listing.status === 'active';

            card.innerHTML = `
                <div class="listing-image">
                    <div class="image-wrapper">
                        <img src="/api/products/image/${listing.id}"
                             alt="${listing.title}"
                             onerror="this.src='placeholder.jpg'">
                    </div>
                    <div class="listing-status status-${isActive ? 'active' : 'inactive'}">
                        ${isActive ? 'Активно' : 'Неактивно'}
                    </div>
                </div>
                <div class="listing-content">
                    <h3 class="listing-title">${listing.title}</h3>
                    <div class="listing-price">$${listing.price.toFixed(2)}</div>
                    <div class="listing-description">${listing.description ?
                        (listing.description.length > 100 ?
                            listing.description.substring(0, 100) + '...' :
                            listing.description) : ''}</div>
                    <div class="listing-meta">
                        <div class="listing-meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            ${listing.city || 'Не указан'}
                        </div>
                        <div class="listing-meta-item">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(listing.createdAt)}
                        </div>
                    </div>
                    <div class="listing-actions">
                        <button type="button" class="listing-action-btn edit-btn" onclick="window.openEditModal('${listing.id}')">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                        <button type="button" class="listing-action-btn delete-btn" onclick="window.openDeleteModal('${listing.id}')">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            `;

            listingsGrid.appendChild(card);
            requestAnimationFrame(() => {
                card.classList.add('fade-in');
            });
        });
    }

    // Восстановление данных из кэша при загрузке страницы
    function restoreFromCache() {
        const cachedData = localStorage.getItem('cachedListings');
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                if (data && data.length > 0) {
                    listings = data;
                    renderListings();
                    listingsData.style.display = 'block';
                } else {
                    noListings.style.display = 'block';
                }
            } catch (e) {
                console.error('Ошибка при восстановлении данных из кэша:', e);
                localStorage.removeItem('cachedListings');
            }
        }
    }

    // Открытие модального окна редактирования
    window.openEditModal = async function(listingId) {
        if (!checkAuth()) return;

        currentListingId = listingId;
        const listing = listings.find(l => l.id === listingId);

        if (!listing) {
            console.error('Товар не найден в списке:', listingId);
            return;
        }

        try {
            console.log('Получаем данные товара:', listingId);

            // Получаем актуальные данные о товаре
            const token = localStorage.getItem('jwtToken');
            const response = await fetch(`/api/products/${listingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось получить данные товара');
            }

            const updatedListing = await response.json();
            console.log('Получены данные товара:', updatedListing);

            // Заполняем форму данными текущего товара
            document.getElementById('editListingId').value = listingId;
            document.getElementById('editTitle').value = updatedListing.title;
            document.getElementById('editDescription').value = updatedListing.description;
            document.getElementById('editPrice').value = updatedListing.price;
            document.getElementById('editCity').value = updatedListing.city;
            document.getElementById('editStatus').value = updatedListing.active ? 'active' : 'inactive';

            // Отображение текущего изображения
            currentImages.innerHTML = `
                <div class="current-image fade-in">
                    <div class="image-preview">
                        <img src="/api/products/image/${listingId}" alt="Изображение товара">
                    </div>
                    <span class="image-number">Фото товара</span>
                </div>
            `;

            // Показываем модальное окно
            editModal.style.display = 'block';
            setTimeout(() => {
                editModal.classList.add('show');
            }, 10);
        } catch (error) {
            console.error('Ошибка при получении данных товара:', error);
            alert('Ошибка при получении данных товара: ' + error.message);
        }
    };

    // Открытие модального окна удаления
    window.openDeleteModal = function(listingId) {
        if (!checkAuth()) return;

        currentListingId = listingId;
        confirmModal.style.display = 'block';
        setTimeout(() => {
            confirmModal.classList.add('show');
        }, 10);
    };

    // Удаление изображения с анимацией
    window.removeImage = async (index) => {
        if (!currentListingId) return;

        try {
            const response = await fetch(`http://localhost:3000/api/listings/${currentListingId}/images/${index}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to remove image');
            }

            // Анимация удаления и обновление списка
            const imageElement = currentImages.children[index];
            imageElement.classList.add('fade-out');

            setTimeout(async () => {
                const listing = listings.find(l => l.id === currentListingId);
                if (listing) {
                    listing.images.splice(index, 1);
                    await renderImages(listing.images);
                }
            }, 300);

        } catch (error) {
            console.error('Error removing image:', error);
            alert('Ошибка при удалении изображения');
        }
    };

    // Функция для отображения изображений
    async function renderImages(images) {
        currentImages.innerHTML = images.map((image, index) => `
            <div class="current-image fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="image-preview">
                    <img src="${image}" alt="Изображение ${index + 1}">
                    <div class="image-overlay">
                        <button type="button" class="remove-image" onclick="removeImage(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <span class="image-number">Фото ${index + 1}</span>
            </div>
        `).join('');
    }

    // Обработка загрузки новых изображений
    editImages.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        try {
            const response = await fetch(`http://localhost:3000/api/listings/${currentListingId}/images`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to upload images');
            }

            const result = await response.json();

            // Обновляем список изображений с анимацией
            const listing = listings.find(l => l.id === currentListingId);
            if (listing) {
                listing.images = result.images;
                await renderImages(listing.images);
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            alert('Ошибка при загрузке изображений');
        }
    });

    // Обработка отправки формы редактирования
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!checkAuth()) return;

        try {
            const formData = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                price: parseFloat(document.getElementById('editPrice').value),
                city: document.getElementById('editCity').value,
                active: document.getElementById('editStatus').value === 'active'
            };

            console.log('Отправляем данные на сервер:', formData);

            const token = localStorage.getItem('jwtToken');
            const response = await fetch(`/api/products/${currentListingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Статус ответа:', response.status);

            if (response.status === 401) {
                localStorage.removeItem('jwtToken');
                notAuthorized.style.display = 'block';
                return;
            }

            if (response.status === 403) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Нет прав на редактирование товара');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Не удалось обновить товар');
            }

            const updatedProduct = await response.json();
            console.log('Получен ответ от сервера:', updatedProduct);

            // Обновляем данные в локальном массиве
            const index = listings.findIndex(l => l.id === currentListingId);
            if (index !== -1) {
                // Преобразуем обновленный товар в формат, соответствующий списку
                const updatedListing = {
                    ...updatedProduct,
                    status: updatedProduct.active ? 'active' : 'inactive'
                };
                listings[index] = updatedListing;
                console.log('Обновлен локальный список:', listings);
            }

            // Перезагружаем список товаров
            await loadListings();
            closeModal(editModal);
            alert('Товар успешно обновлен');
        } catch (error) {
            console.error('Ошибка при обновлении товара:', error);
            alert('Ошибка при обновлении товара: ' + error.message);
        }
    });

    // Функция закрытия модального окна
    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            // Очищаем форму при закрытии
            if (modal === editModal) {
                editForm.reset();
                currentImages.innerHTML = '';
            }
        }, 300);
    }

    // Обработка удаления объявления
    confirmDelete.addEventListener('click', async () => {
        if (!currentListingId || !checkAuth()) return;

        try {
            const token = localStorage.getItem('jwtToken');
            const response = await fetch(`/api/products/delete/${currentListingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (response.status === 401) {
                localStorage.removeItem('jwtToken');
                notAuthorized.style.display = 'block';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to delete listing');
            }

            await loadListings();
            closeModal(confirmModal);
        } catch (error) {
            console.error('Error deleting listing:', error);
            alert('Ошибка при удалении объявления');
        }
    });

    // Обработчики закрытия модальных окон
    closeEditModal.addEventListener('click', () => closeModal(editModal));
    cancelEdit.addEventListener('click', () => closeModal(editModal));
    cancelDelete.addEventListener('click', () => closeModal(confirmModal));

    // Обработка фильтров и сортировки
    statusFilter.addEventListener('change', applyFilters);
    sortOrder.addEventListener('change', applyFilters);
    refreshBtn.addEventListener('click', loadListings);

    // Закрытие модальных окон при клике вне их содержимого
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal(editModal);
        }
        if (e.target === confirmModal) {
            closeModal(confirmModal);
        }
    });

    // Обработка выбора города "Другой"
    document.getElementById('editCity').addEventListener('change', function() {
        const otherCityGroup = document.getElementById('editOtherCityGroup');
        if (this.value === 'Другой') {
            otherCityGroup.style.display = 'block';
            document.getElementById('editOtherCity').required = true;
        } else {
            otherCityGroup.style.display = 'none';
            document.getElementById('editOtherCity').required = false;
        }
    });

    // Обработчик изменения токена
    window.addEventListener('storage', (e) => {
        if (e.key === 'jwtToken') {
            if (!e.newValue) {
                notAuthorized.style.display = 'block';
                listingsData.style.display = 'none';
            } else {
                loadListings();
            }
        }
    });

    // Инициализация
    restoreFromCache();
    loadListings();
});