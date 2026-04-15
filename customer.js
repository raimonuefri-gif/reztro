/* ============================================
   ReZtro — Customer Ordering Logic (Supabase)
   ============================================ */

// --- State ---
let cart = [];
let currentRestaurantId = null;
let currentView = 'restaurants';
let allMenuItems = []; // cache for the current restaurant menu

// --- DOM ---
const toastContainer    = document.getElementById('toastContainer');
const cartBar           = document.getElementById('cartBar');
const cartCountBadge    = document.getElementById('cartCountBadge');
const cartTotalDisplay  = document.getElementById('cartTotalDisplay');

// --- Init ---
async function init() {
    // Restore cart from session
    try { cart = JSON.parse(sessionStorage.getItem('reztro_cart') || '[]'); } catch { cart = []; }
    currentRestaurantId = sessionStorage.getItem('reztro_cart_restaurant') || null;

    await renderRestaurants();
    updateCartBar();

    document.getElementById('searchRestaurants').addEventListener('input', (e) => {
        renderRestaurants(e.target.value);
    });

    document.getElementById('backToRestaurants').addEventListener('click', () => showView('restaurants'));
    document.getElementById('backToMenu').addEventListener('click', () => {
        if (currentRestaurantId) showRestaurantMenu(currentRestaurantId);
    });
    document.getElementById('backToHome').addEventListener('click', () => showView('restaurants'));
    cartBar.addEventListener('click', showCartView);
}

// --- Views ---
function showView(view) {
    currentView = view;
    document.querySelectorAll('.customer-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) {
        target.classList.add('active');
        target.style.animation = 'none';
        target.offsetHeight;
        target.style.animation = '';
    }
    const header = document.getElementById('customerHeader');
    header.style.display = view === 'restaurants' ? '' : 'none';
    updateCartBar();
}

// --- Toast ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    toast.addEventListener('click', () => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); });
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Restaurants ---
async function renderRestaurants(search = '') {
    const container = document.getElementById('restaurantsContainer');
    container.innerHTML = `<div style="text-align:center;padding:40px;opacity:.5">Cargando restaurantes...</div>`;

    let query = _supabase.from('restaurants').select('*');
    const { data: restaurants, error } = await query;

    if (error) {
        container.innerHTML = `<div class="customer-empty"><h3>Error al cargar</h3><p>${error.message}</p></div>`;
        return;
    }

    let filtered = restaurants || [];
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(s) ||
            (r.category && r.category.toLowerCase().includes(s))
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="customer-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                <h3>${search ? 'Sin resultados' : 'No hay restaurantes aún'}</h3>
                <p>${search ? 'Intenta con otro término de búsqueda.' : 'Cuando los restaurantes se registren, aparecerán aquí.'}</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="restaurants-grid">
            ${filtered.map((r, i) => `
                <div class="restaurant-card" onclick="showRestaurantMenu('${r.id}')" style="animation-delay:${i * 0.06}s">
                    <div class="restaurant-logo">
                        ${r.logo ? `<img src="${r.logo}" alt="${r.name}">` : r.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="restaurant-info">
                        <div class="restaurant-name">${r.name}</div>
                        <div class="restaurant-category">${r.category || ''}</div>
                        <div class="restaurant-meta">
                            <span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                                Ver menú
                            </span>
                            <span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${r.hours || 'Sin horario'}
                            </span>
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;
}

// --- Restaurant Menu ---
async function showRestaurantMenu(restaurantId) {
    const { data: restaurant } = await _supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

    if (!restaurant) return;

    // Clear cart if switching restaurant
    if (currentRestaurantId && currentRestaurantId !== restaurantId && cart.length > 0) {
        if (!confirm('Tienes items de otro restaurante en tu carrito. ¿Deseas vaciarlo y ver este menú?')) return;
        cart = [];
        saveCart();
    }

    currentRestaurantId = restaurantId;
    sessionStorage.setItem('reztro_cart_restaurant', restaurantId);

    const { data: items } = await _supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('available', true);

    allMenuItems = items || [];

    let html = `
        <div class="restaurant-banner">
            <div class="banner-logo">
                ${restaurant.logo ? `<img src="${restaurant.logo}" alt="${restaurant.name}">` : restaurant.name.charAt(0).toUpperCase()}
            </div>
            <div class="banner-info">
                <h2>${restaurant.name}</h2>
                <p>${restaurant.category || ''} · ${restaurant.hours || ''}</p>
            </div>
        </div>`;

    if (allMenuItems.length === 0) {
        html += `
            <div class="customer-empty" style="padding:40px 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                <h3>Menú vacío</h3>
                <p>Este restaurante aún no ha añadido platos.</p>
            </div>`;
    } else {
        // Group by category (using description field as proxy for category since schema has no category in menu_items)
        const grouped = {};
        allMenuItems.forEach(item => {
            const cat = item.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        Object.entries(grouped).forEach(([cat, catItems]) => {
            html += `<h3 class="menu-section-title">${cat}</h3>`;
            catItems.forEach(item => {
                const inCart = cart.find(c => c.id === item.id);
                const qty = inCart ? inCart.qty : 0;

                html += `
                <div class="customer-menu-item">
                    <div class="cmi-photo">
                        ${item.photo ? `<img src="${item.photo}" alt="${item.name}">` :
                        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
                    </div>
                    <div class="cmi-info">
                        <div class="cmi-name">${item.name}</div>
                        <div class="cmi-desc">${item.description || ''}</div>
                        <div class="cmi-footer">
                            <span class="cmi-price">RD$ ${item.price}</span>
                            ${qty > 0
                            ? `<div class="cart-qty-controls">
                                    <button class="qty-btn remove" onclick="removeFromCart('${item.id}')">−</button>
                                    <span class="cart-qty">${qty}</span>
                                    <button class="qty-btn" onclick="addToCart('${item.id}')">+</button>
                                  </div>`
                            : `<button class="add-to-cart-btn" onclick="addToCart('${item.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                  </button>`}
                        </div>
                    </div>
                </div>`;
            });
        });
    }

    document.getElementById('menuContainer').innerHTML = html;
    showView('menu');
}

// --- Cart ---
function addToCart(itemId) {
    const item = allMenuItems.find(m => m.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    }

    saveCart();
    updateCartBar();
    showToast(`${item.name} añadido`);

    if (currentView === 'menu') showRestaurantMenu(currentRestaurantId);
    if (currentView === 'cart') showCartView();
}

function removeFromCart(itemId) {
    const existing = cart.find(c => c.id === itemId);
    if (!existing) return;
    existing.qty -= 1;
    if (existing.qty <= 0) cart = cart.filter(c => c.id !== itemId);
    saveCart();
    updateCartBar();
    if (currentView === 'menu') showRestaurantMenu(currentRestaurantId);
    if (currentView === 'cart') showCartView();
}

function saveCart() { sessionStorage.setItem('reztro_cart', JSON.stringify(cart)); }
function getCartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateCartBar() {
    const count = getCartCount();
    const total = getCartTotal();
    if (count > 0 && currentView !== 'success') {
        cartBar.classList.remove('hidden');
        cartCountBadge.textContent = count;
        cartTotalDisplay.textContent = `RD$ ${total.toLocaleString('es-DO')}`;
    } else {
        cartBar.classList.add('hidden');
    }
}

function showCartView() {
    const container = document.getElementById('cartContainer');
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="customer-empty" style="padding:40px 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                <h3>Carrito vacío</h3>
                <p>Añade artículos del menú para hacer tu pedido.</p>
            </div>`;
        showView('cart');
        return;
    }

    const total = getCartTotal();
    container.innerHTML = `
        <div class="cart-items-list">
            ${cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">RD$ ${item.price} c/u</div>
                    </div>
                    <div class="cart-qty-controls">
                        <button class="qty-btn remove" onclick="removeFromCart('${item.id}')">−</button>
                        <span class="cart-qty">${item.qty}</span>
                        <button class="qty-btn" onclick="addToCart('${item.id}')">+</button>
                    </div>
                    <div style="min-width:80px; text-align:right; font-weight:700; font-size:14px;">
                        RD$ ${(item.price * item.qty).toLocaleString('es-DO')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="cart-summary">
            <div class="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>RD$ ${total.toLocaleString('es-DO')}</span>
            </div>
        </div>

        <div class="checkout-section">
            <h3>Información de Contacto</h3>
            <div class="form-group">
                <label for="customerName">Tu Nombre *</label>
                <input type="text" id="customerName" class="form-control" placeholder="Ingresa tu nombre">
            </div>
            <div class="form-group">
                <label for="customerPhone">Tu Teléfono *</label>
                <input type="tel" id="customerPhone" class="form-control" placeholder="809-555-0000">
            </div>
            <button class="btn btn-primary btn-block" id="placeOrderBtn" style="margin-top:12px;">
                Enviar Pedido — RD$ ${total.toLocaleString('es-DO')}
            </button>
        </div>`;

    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
    showView('cart');
}

// --- Place Order (Supabase) ---
async function placeOrder() {
    const name  = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();

    if (!name || !phone) { showToast('Ingresa tu nombre y teléfono.', 'error'); return; }
    if (!currentRestaurantId || cart.length === 0) { showToast('Tu carrito está vacío.', 'error'); return; }

    const total = getCartTotal();
    const btn   = document.getElementById('placeOrderBtn');
    btn.disabled  = true;
    btn.textContent = 'Enviando...';

    // 1. Insert the order
    const { data: order, error: orderError } = await _supabase
        .from('orders')
        .insert([{
            restaurant_id: currentRestaurantId,
            status:        'received',
            total_price:   total,
            customer_name: name,
            customer_phone: phone
        }])
        .select()
        .single();

    if (orderError) {
        showToast('Error al enviar el pedido: ' + orderError.message, 'error');
        btn.disabled = false;
        btn.textContent = `Enviar Pedido — RD$ ${total.toLocaleString('es-DO')}`;
        return;
    }

    // 2. Insert order_items
    const orderItems = cart.map(item => ({
        order_id:     order.id,
        menu_item_id: item.id,
        quantity:     item.qty
    }));

    await _supabase.from('order_items').insert(orderItems);

    // 3. Clear cart
    cart = [];
    currentRestaurantId = null;
    saveCart();
    sessionStorage.removeItem('reztro_cart_restaurant');
    updateCartBar();

    showView('success');
    showToast('¡Pedido enviado exitosamente!');
}

// --- Start ---
init();
