// ===============================================
// app.js - El ÚNICO script para todo el sitio
// ===============================================

// --- Variables Globales de Listeners ---
let mainScrollContainer = null;
let currentIndex = 0;
let sections = [];
let horizontalPairs = new Set();
let isLocked = false;
let touchY = null;
let handleWheelRef = null;
let handleKeyDownRef = null;
let handleTouchStartRef = null;
let handleTouchMoveRef = null;
let handleAnchorClickRef = null;
let scrollLinks = [];
let navbarScrollHandler = null;
let scrollAnimationsObserver = null;

// --- Estado del carrito ---
const cartState = {
  items: []
};

let cartDOM = {
  overlay: null,
  panel: null,
  itemsList: null,
  emptyState: null,
  subtotal: null,
  continueBtn: null,
  checkoutBtn: null,
  closeBtn: null
};

let cartIsOpen = false;
let previousOverflow = {
  body: '',
  html: ''
};

let cartEscapeListenerAttached = false;

// --- Lógica de Estado (Timestamp + Flag) ---
let lastAnimationTime = 0;
let isAnimating = false; // Flag adicional para prevenir condiciones de carrera
const animationDuration = 800; // Tu animación MÁS LARGA (horizontal)
const animationBuffer = 100;   // Un búfer de seguridad
const animationCooldown = animationDuration + animationBuffer; // Total: 900ms
let visitedSections = new Set(); // Trackear secciones ya visitadas/vistas

// ===============================================
// --- DEFINICIONES DE FUNCIONES (Todas las páginas) ---
// ===============================================

function formatCurrency(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeValue);
}

function findCartItem(key) {
  return cartState.items.find(item => item.key === key);
}

function getCartItemKey(id, size = null) {
  return `${id}__${size || 'default'}`;
}

function calculateCartTotals() {
  return cartState.items.reduce((total, item) => total + item.price * item.quantity, 0);
}

function renderCart() {
  if (!cartDOM.itemsList || !cartDOM.emptyState || !cartDOM.subtotal) {
    return;
  }

  const hasItems = cartState.items.length > 0;
  cartDOM.emptyState.classList.toggle('hidden', hasItems);
  cartDOM.itemsList.classList.toggle('hidden', !hasItems);
  cartDOM.itemsList.innerHTML = '';

  cartState.items.forEach(item => {
    const li = document.createElement('li');
    li.dataset.key = item.key;
    li.className = 'flex gap-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm';
    li.innerHTML = `
      <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#1a1a1a] border border-white/10">
        <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover" loading="lazy" />
      </div>
      <div class="flex flex-1 flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-inter text-sm font-semibold text-white">${item.name}</p>
            ${item.size ? `<p class="font-inter text-xs text-gray-400 mt-1">Talle: ${item.size}</p>` : ''}
          </div>
          <button type="button" class="text-xs text-gray-400 hover:text-white transition-colors font-inter inline-flex items-center gap-1" data-cart-remove="${item.key}">
            <span aria-hidden="true">&times;</span>
            <span>Eliminar</span>
          </button>
        </div>
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center rounded-full border border-white/10 bg-[#151515]">
            <button type="button" class="px-3 py-1 text-sm text-white hover:text-[#00FFFF] transition-colors" data-cart-decrement="${item.key}" aria-label="Reducir cantidad">−</button>
            <span class="px-3 text-sm text-white font-inter" aria-live="polite">${item.quantity}</span>
            <button type="button" class="px-3 py-1 text-sm text-white hover:text-[#00FFFF] transition-colors" data-cart-increment="${item.key}" aria-label="Aumentar cantidad">+</button>
          </div>
          <span class="font-inter text-sm font-semibold text-white">${formatCurrency(item.price * item.quantity)}</span>
        </div>
      </div>
    `;
    cartDOM.itemsList.appendChild(li);
  });

  cartDOM.subtotal.textContent = formatCurrency(calculateCartTotals());
  updateCartUI();
}

function openCart() {
  if (!cartDOM.panel || !cartDOM.overlay) return;
  if (cartIsOpen) return;
  cartIsOpen = true;
  previousOverflow = {
    body: document.body.style.overflow,
    html: document.documentElement.style.overflow
  };
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  const navbar = document.getElementById('main-navbar');
  const navbarHeight = navbar ? navbar.offsetHeight : 0;
  const extraSpace = 16;
  cartDOM.panel.style.paddingTop = `${navbarHeight + extraSpace}px`;

  cartDOM.panel.classList.remove('hidden');
  cartDOM.overlay.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
  cartDOM.overlay.classList.add('opacity-100');
  cartDOM.overlay.setAttribute('aria-hidden', 'false');
  cartDOM.panel.classList.remove('translate-x-full');
  cartDOM.panel.classList.add('translate-x-0');
  cartDOM.panel.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  if (!cartDOM.panel || !cartDOM.overlay) return;
  if (!cartIsOpen) {
    ensureCartClosedState();
    return;
  }
  cartIsOpen = false;
  cartDOM.overlay.classList.remove('opacity-100');
  cartDOM.overlay.classList.add('opacity-0');
  cartDOM.overlay.classList.add('pointer-events-none');
  cartDOM.overlay.setAttribute('aria-hidden', 'true');
  cartDOM.panel.classList.add('translate-x-full');
  cartDOM.panel.classList.remove('translate-x-0');
  cartDOM.panel.setAttribute('aria-hidden', 'true');
  cartDOM.panel.style.paddingTop = '';
  document.body.style.overflow = previousOverflow.body || '';
  document.documentElement.style.overflow = previousOverflow.html || '';
  // Fallback por si la transición no dispara.
  setTimeout(() => {
    if (!cartIsOpen) {
      cartDOM.overlay.classList.add('hidden');
      cartDOM.panel.classList.add('hidden');
    }
  }, 320);
}

function ensureCartClosedState() {
  if (!cartDOM.overlay || !cartDOM.panel) return;
  cartIsOpen = false;
  cartDOM.overlay.classList.remove('opacity-100');
  cartDOM.overlay.classList.add('opacity-0', 'pointer-events-none', 'hidden');
  cartDOM.overlay.setAttribute('aria-hidden', 'true');
  cartDOM.panel.classList.add('translate-x-full', 'hidden');
  cartDOM.panel.classList.remove('translate-x-0');
  cartDOM.panel.setAttribute('aria-hidden', 'true');
  cartDOM.panel.style.paddingTop = '';
}

function handleOverlayTransitionEnd(event) {
  if (!cartDOM.overlay) return;
  if (event.propertyName !== 'opacity') return;
  if (!cartIsOpen) {
    cartDOM.overlay.classList.add('pointer-events-none', 'hidden');
    cartDOM.overlay.setAttribute('aria-hidden', 'true');
  }
}

function handlePanelTransitionEnd(event) {
  if (!cartDOM.panel) return;
  if (event.propertyName !== 'transform') return;
  if (!cartIsOpen) {
    cartDOM.panel.classList.add('hidden');
    cartDOM.panel.setAttribute('aria-hidden', 'true');
  }
}

function updateCartItemQuantity(key, delta) {
  const item = findCartItem(key);
  if (!item) return;
  const newQuantity = item.quantity + delta;
  if (newQuantity <= 0) {
    cartState.items = cartState.items.filter(i => i.key !== key);
  } else {
    item.quantity = newQuantity;
  }
  renderCart();
}

function removeCartItem(key) {
  cartState.items = cartState.items.filter(item => item.key !== key);
  renderCart();
}

function updateCartUI() {
  if (!cartDOM.itemsList) return;

  const itemElements = cartDOM.itemsList.querySelectorAll('li[data-key]');
  itemElements.forEach(itemEl => {
    const itemKey = itemEl.dataset.key;
    const removeBtn = itemEl.querySelector('[data-cart-remove]');
    const incrementBtn = itemEl.querySelector('[data-cart-increment]');
    const decrementBtn = itemEl.querySelector('[data-cart-decrement]');

    if (removeBtn) {
      removeBtn.addEventListener('click', () => handleRemoveItem(itemKey));
    }
    if (incrementBtn) {
      incrementBtn.addEventListener('click', () => handleUpdateQuantity(itemKey, 'inc'));
    }
    if (decrementBtn) {
      decrementBtn.addEventListener('click', () => handleUpdateQuantity(itemKey, 'dec'));
    }
  });
}

function handleRemoveItem(id) {
  console.log('Remover item:', id);
  removeCartItem(id);
}

function handleUpdateQuantity(id, type) {
  console.log('Actualizar cantidad:', id, type);
  if (type === 'inc') {
    updateCartItemQuantity(id, 1);
  } else if (type === 'dec') {
    updateCartItemQuantity(id, -1);
  }
}

function handleAddItem(product, quantity = 1) {
  if (!product || !product.id || !product.name || product.price === undefined || !product.image) {
    console.error('Producto inválido', product);
    return;
  }

  const size = product.size || null;
  const key = getCartItemKey(product.id, size);
  const existingItem = findCartItem(key);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const priceNumber = Number(product.price);
    cartState.items.push({
      key,
      id: product.id,
      name: product.name,
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      image: product.image,
      quantity,
      size
    });
  }

  renderCart();
  openCart();
}

function parseProductFromButton(button) {
  if (!button) return null;
  const id = button.dataset.productId;
  const name = button.dataset.productName;
  const priceValue = Number(button.dataset.productPrice || '0');
  const image = button.dataset.productImage || '';
  if (!id || !name) return null;
  return {
    id,
    name,
    price: Number.isFinite(priceValue) ? priceValue : 0,
    image
  };
}

function handleDetailAddToCart(button) {
  const product = parseProductFromButton(button);
  if (!product) return;
  const quantityInput = document.getElementById('quantity-input');
  const quantity = quantityInput ? Math.max(1, parseInt(quantityInput.value, 10) || 1) : 1;
  let selectedSize = null;
  const sizeButtons = document.querySelectorAll('.size-btn');
  sizeButtons.forEach(btn => {
    if (btn.getAttribute('aria-pressed') === 'true') {
      selectedSize = btn.getAttribute('data-size');
    }
  });
  const enrichedProduct = {
    ...product,
    size: selectedSize
  };
  handleAddItem(enrichedProduct, quantity);
}

function initProductDetailPage() {
  const addButton = document.getElementById('add-to-cart-btn');
  if (!addButton) return;

  if (addButton.dataset.cartBound !== 'true') {
    addButton.dataset.cartBound = 'true';
    addButton.addEventListener('click', (event) => {
      event.preventDefault();
      handleDetailAddToCart(addButton);
    });
  }

  const mainImage = document.getElementById('main-product-image');
  const thumbnailButtons = document.querySelectorAll('.thumbnail-btn');
  if (mainImage && thumbnailButtons.length) {
    thumbnailButtons.forEach(btn => {
      if (btn.dataset.detailBound === 'true') return;
      btn.dataset.detailBound = 'true';
      btn.addEventListener('click', () => {
        const img = btn.querySelector('img');
        if (!img) return;
        mainImage.src = img.src;
        mainImage.alt = img.alt;
        thumbnailButtons.forEach(other => {
          other.classList.remove('border-[#00FFFF]');
          other.classList.add('border-transparent');
        });
        btn.classList.remove('border-transparent');
        btn.classList.add('border-[#00FFFF]');
      });
    });
  }

  const sizeButtons = document.querySelectorAll('.size-btn');
  if (sizeButtons.length) {
    sizeButtons.forEach(btn => {
      if (btn.dataset.detailBound === 'true') return;
      btn.dataset.detailBound = 'true';
      btn.addEventListener('click', () => {
        sizeButtons.forEach(other => {
          other.classList.remove('bg-[#00FFFF]', 'text-[#101010]');
          other.classList.add('bg-[#1a1a1a]', 'text-white');
          other.setAttribute('aria-pressed', 'false');
        });
        btn.classList.remove('bg-[#1a1a1a]', 'text-white');
        btn.classList.add('bg-[#00FFFF]', 'text-[#101010]');
        btn.setAttribute('aria-pressed', 'true');
      });
    });
  }

  const quantityInput = document.getElementById('quantity-input');
  const increaseBtn = document.getElementById('quantity-increase');
  const decreaseBtn = document.getElementById('quantity-decrease');
  const sanitizeQuantity = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  };

  if (quantityInput && quantityInput.dataset.detailBound !== 'true') {
    quantityInput.dataset.detailBound = 'true';
    quantityInput.addEventListener('input', () => {
      quantityInput.value = sanitizeQuantity(quantityInput.value);
    });
    quantityInput.value = sanitizeQuantity(quantityInput.value);
  }

  if (increaseBtn && increaseBtn.dataset.detailBound !== 'true') {
    increaseBtn.dataset.detailBound = 'true';
    increaseBtn.addEventListener('click', () => {
      if (!quantityInput) return;
      const nextValue = sanitizeQuantity(quantityInput.value) + 1;
      quantityInput.value = nextValue;
    });
  }

  if (decreaseBtn && decreaseBtn.dataset.detailBound !== 'true') {
    decreaseBtn.dataset.detailBound = 'true';
    decreaseBtn.addEventListener('click', () => {
      if (!quantityInput) return;
      const nextValue = sanitizeQuantity(quantityInput.value) - 1;
      quantityInput.value = nextValue < 1 ? 1 : nextValue;
    });
  }
}

function initProductCards() {
  const productButtons = document.querySelectorAll('.buy-btn[data-product-id]');
  productButtons.forEach(button => {
    if (button.dataset.cartBound === 'true') return;
    button.dataset.cartBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const product = parseProductFromButton(button);
      if (!product) return;
      handleAddItem(product, 1);
    });
  });
}

function initCart() {
  const overlay = document.getElementById('cart-overlay');
  const panel = document.getElementById('cart-panel');
  const itemsList = document.getElementById('cart-items-list');
  const emptyState = document.getElementById('cart-empty-state');
  const subtotal = document.getElementById('cart-subtotal');
  const closeBtn = document.getElementById('cart-close-btn');
  const continueBtn = document.getElementById('cart-continue-btn');
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  const toggleButtons = document.querySelectorAll('#cart-toggle-btn');

  if (!overlay || !panel) {
    return;
  }

  const overlayAlreadyBound = overlay.dataset.cartBound === 'true';

  cartDOM = {
    overlay,
    panel,
    itemsList,
    emptyState,
    subtotal,
    continueBtn,
    checkoutBtn,
    closeBtn
  };

  if (!overlayAlreadyBound) {
    overlay.dataset.cartBound = 'true';
    panel.dataset.cartBound = 'true';
    renderCart();

    overlay.addEventListener('click', closeCart);
    overlay.addEventListener('transitionend', handleOverlayTransitionEnd);
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCart);
    }
    if (continueBtn) {
      continueBtn.addEventListener('click', closeCart);
    }
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        alert('Checkout disponible próximamente.');
      });
    }
    panel.addEventListener('transitionend', handlePanelTransitionEnd);
  } else {
    renderCart();
  }

  toggleButtons.forEach(btn => {
    if (btn && btn.dataset.cartBound !== 'true') {
      btn.dataset.cartBound = 'true';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        openCart();
      });
    }
  });

  if (!cartEscapeListenerAttached) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && cartIsOpen) {
        closeCart();
      }
    });
    cartEscapeListenerAttached = true;
  }

  ensureCartClosedState();
}

// --- Scripts Globales (Menú) ---
function initSimpleMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!mobileMenuBtn || !mobileMenu || !closeMobileMenuBtn) { return; }
  
  function toggleMenu(e) { if (e) { e.stopPropagation(); } mobileMenu.classList.toggle('hidden'); }
  function closeMenu(e) { if (e) { e.stopPropagation(); } mobileMenu.classList.add('hidden'); }
  
  mobileMenuBtn.addEventListener('click', toggleMenu);
  closeMobileMenuBtn.addEventListener('click', closeMenu);
  
  const mobileMenuLinks = mobileMenu.querySelectorAll('a');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', (e) => { 
      e.stopPropagation(); 
      closeMenu(e); 
    });
  });
}

// --- Scripts del HOME (Index) ---
function initCarousel() {
  const carouselContainer = document.getElementById('carousel-slides');
  if (!carouselContainer) return; 
  const carouselSlides = carouselContainer.querySelectorAll('.carousel-slide');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const indicators = document.querySelectorAll('.carousel-indicator');
  if (carouselSlides.length === 0) return;
  let currentSlide = 0;
  function updateIndicators(index) {
    indicators.forEach((indicator, i) => {
      if (i === index) {
        indicator.classList.add('active', 'bg-teal-400', 'opacity-100');
        indicator.classList.remove('bg-teal-300', 'opacity-50');
      } else {
        indicator.classList.remove('active', 'bg-teal-400', 'opacity-100');
        indicator.classList.add('bg-teal-300', 'opacity-50');
      }
    });
  }
  function showSlide(index) {
    carouselSlides.forEach((slide, i) => {
      if (i === index) slide.classList.remove('hidden');
      else slide.classList.add('hidden');
    });
    updateIndicators(index);
  }
  function nextSlide(e) { if (e) e.stopPropagation(); currentSlide = (currentSlide + 1) % carouselSlides.length; showSlide(currentSlide); }
  function prevSlide(e) { if (e) e.stopPropagation(); currentSlide = (currentSlide - 1 + carouselSlides.length) % carouselSlides.length; showSlide(currentSlide); }
  function goToSlide(index) { currentSlide = index; showSlide(currentSlide); }
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', function (e) { e.stopPropagation(); goToSlide(index); });
  });
  showSlide(0);
}

function initParallaxEffect() {
  const cards = document.querySelectorAll('.parallax-card');
  if (cards.length === 0) return;
  cards.forEach(card => {
    const image = card.querySelector('.parallax-image');
    if (!image) return;
    const maxRotation = 8; 
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      const { width, height } = rect;
      const middleX = width / 2; const middleY = height / 2;
      const rotateY = ((x - middleX) / middleX) * maxRotation;
      const rotateX = -(((y - middleY) / middleY) * maxRotation);
      image.style.transform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      image.style.transform = 'scale(1.05) rotateX(0deg) rotateY(0deg)';
    });
  });
}

function destroyIndexScroll() {
  if (mainScrollContainer && handleWheelRef) { mainScrollContainer.removeEventListener('wheel', handleWheelRef); }
  if (handleKeyDownRef) { window.removeEventListener('keydown', handleKeyDownRef); }
  if (mainScrollContainer && handleTouchStartRef) { mainScrollContainer.removeEventListener('touchstart', handleTouchStartRef); }
  if (mainScrollContainer && handleTouchMoveRef) { mainScrollContainer.removeEventListener('touchmove', handleTouchMoveRef); }
  scrollLinks.forEach(link => { if (handleAnchorClickRef) { link.removeEventListener('click', handleAnchorClickRef); } });
  scrollLinks = [];
  handleWheelRef = null;
  handleKeyDownRef = null;
  handleTouchStartRef = null;
  handleTouchMoveRef = null;
  handleAnchorClickRef = null;
  lastAnimationTime = 0;
  isAnimating = false;
  visitedSections.clear(); // Limpiar secciones visitadas al destruir
  currentIndex = 0;
  sections.forEach(section => {
    if (section) {
      section.style.removeProperty('position');
      section.style.removeProperty('inset');
      section.style.removeProperty('transform');
      section.style.removeProperty('transition');
      section.style.removeProperty('z-index');
      section.style.removeProperty('opacity');
      section.style.removeProperty('filter');
      section.style.removeProperty('top');
      section.style.removeProperty('left');
      section.style.removeProperty('right');
      section.style.removeProperty('bottom');
      section.style.removeProperty('width');
      section.style.removeProperty('height');
    }
  });
  sections = [];
  horizontalPairs.clear();
  isLocked = false;
  if (mainScrollContainer) {
    mainScrollContainer.style.overflow = '';
  }
}

function initIndexScroll() {
  destroyIndexScroll(); 
  mainScrollContainer = document.querySelector('main[data-barba="container"]');
  if (!mainScrollContainer) { return; }
  
  // ¡IMPORTANTE! Ahora que el CSS está limpio, 
  // el JS SÍ puede tomar control del overflow.
  mainScrollContainer.style.overflow = 'hidden';

  sections = Array.from(mainScrollContainer.querySelectorAll(':scope > section'));
  if (sections.length === 0) { return; }
  horizontalPairs = new Set(['3-4', '4-3', '4-5', '5-4', '5-6', '6-5']);
  
  sections.forEach(section => {
    if (section) {
      section.style.removeProperty('position');
      section.style.removeProperty('inset');
      section.style.removeProperty('transform');
      section.style.removeProperty('transition');
      section.style.removeProperty('z-index');
      section.style.removeProperty('opacity');
      section.style.removeProperty('filter');
      section.style.removeProperty('top');
      section.style.removeProperty('left');
      section.style.removeProperty('right');
      section.style.removeProperty('bottom');
      section.style.removeProperty('width');
      section.style.removeProperty('height');
    }
  });
  
  const navbar = document.getElementById('main-navbar');
  
  function triggerSectionAnimations(sectionElement) {
    if (!sectionElement) return;
    const animatedElements = sectionElement.querySelectorAll('.anim-child');
    animatedElements.forEach(element => {
      if (!element.classList.contains('opacity-0')) return; 
      const delayClass = Array.from(element.classList).find(c => c.startsWith('delay-'));
      const delay = delayClass ? parseInt(delayClass.split('-')[1]) * 15 : 0;
      setTimeout(() => {
        element.classList.add('transition-all', 'ease-out');
        element.style.transitionDuration = '250ms';
        element.classList.remove('opacity-0', 'translate-y-4', '-translate-x-8', 'translate-x-8');
        element.classList.add('opacity-100'); 
      }, delay);
    });
  }
  
  function setScrollLock(lock) { 
    isLocked = lock; 
    // Ahora esta línea SÍ funcionará porque no hay CSS que la pise
    mainScrollContainer.style.overflow = lock ? 'hidden' : 'hidden'; // Siempre hidden para el scroll-hijack
  }
  
  function clearStyles(element) {
    if (!element) return;
    element.style.removeProperty('position');
    element.style.removeProperty('inset');
    element.style.removeProperty('transform');
    element.style.removeProperty('transition');
    element.style.removeProperty('z-index');
    element.style.removeProperty('opacity');
    element.style.removeProperty('filter');
    element.style.removeProperty('top');
    element.style.removeProperty('left');
    element.style.removeProperty('right');
    element.style.removeProperty('bottom');
    element.style.removeProperty('width');
    element.style.removeProperty('height');
  }

  // Limpiador de fantasmas (solo limpia secciones que NO están siendo animadas NI visitadas)
  function clearAllGhostStyles(excludeIndices = []) {
    sections.forEach((section, index) => {
      // NO limpiar: secciones excluidas, secciones visitadas, o sección actual
      if (excludeIndices.includes(index) || visitedSections.has(index) || index === currentIndex) {
        return;
      }
      clearStyles(section);
    });
  }

  function animateHorizontal(toIndex, direction) {
    const el = sections[toIndex]; 
    const fromIndex = currentIndex;
    const fromEl = sections[fromIndex];
    if (!el || !fromEl || isAnimating) return;
    
    const isToVisited = visitedSections.has(toIndex);
    const isFromVisited = visitedSections.has(fromIndex);
    
    // Si la sección destino ya fue visitada, solo hacer scroll directo sin animación
    if (isToVisited) {
      isAnimating = true;
      mainScrollContainer.scrollTo({ top: el.offsetTop, behavior: 'auto' });
      currentIndex = toIndex;
      setTimeout(() => {
        isAnimating = false;
        lastAnimationTime = Date.now();
      }, 50);
      return;
    }
    
    isAnimating = true;
    clearAllGhostStyles([fromIndex, toIndex]);
    setScrollLock(true);
    if (navbar) { navbar.classList.remove('bg-transparent'); navbar.classList.add('bg-[#101010]'); }
    
    el.style.position = 'fixed'; 
    el.style.top = '0';
    el.style.left = '0';
    el.style.right = '0';
    el.style.bottom = '0';
    el.style.width = '100%';
    el.style.height = '100vh';
    el.style.zIndex = '50'; 
    el.style.opacity = '0.2';
    el.style.transform = direction === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
    
    const dur = 800; // 800ms
    const easing = 'cubic-bezier(0.87, 0, 0.13, 1)';
    el.style.transition = `transform ${dur}ms ${easing}, opacity ${dur}ms ease-out`;
    
    // Solo animar la sección origen si NO ha sido visitada
    if (!isFromVisited) {
      fromEl.style.position = 'fixed';
      fromEl.style.top = '0';
      fromEl.style.left = '0';
      fromEl.style.right = '0';
      fromEl.style.bottom = '0';
      fromEl.style.width = '100%';
      fromEl.style.height = '100vh';
      fromEl.style.zIndex = '30';
      fromEl.style.transition = `transform ${dur}ms ${easing}, filter ${dur}ms ease-out, opacity ${dur}ms ease-out`;
      fromEl.style.transform = direction === 'right' ? 'translateX(-8%)' : 'translateX(8%)';
      fromEl.style.filter = 'blur(1px)'; 
      fromEl.style.opacity = '0.85';
    }
    
    el.offsetHeight;
    if (!isFromVisited) fromEl.offsetHeight;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = 'translateX(0)'; 
        el.style.opacity = '1';
      });
    });
    
    setTimeout(() => {
      // NUNCA limpiar estilos de secciones visitadas
      if (!isFromVisited) {
        clearStyles(fromEl);
      }
      clearStyles(el);
      
      triggerSectionAnimations(el);
      visitedSections.add(toIndex); // Marcar como visitada
      
      mainScrollContainer.scrollTo({ top: el.offsetTop, behavior: 'auto' });
      
      setScrollLock(false);
      currentIndex = toIndex;
      isAnimating = false;
      lastAnimationTime = Date.now();
    }, dur + 50); // 850ms
    
    // Timeout de seguridad: si algo falla, resetear después de 2 segundos
    setTimeout(() => {
      if (isAnimating && sections[toIndex] === el && sections[fromIndex] === fromEl) {
        // NO limpiar secciones visitadas
        if (!visitedSections.has(fromIndex)) {
          clearStyles(fromEl);
        }
        if (!visitedSections.has(toIndex)) {
          clearStyles(el);
        }
        isAnimating = false;
        setScrollLock(false);
        lastAnimationTime = Date.now();
      }
    }, 2000);
  }

  function animateVertical(toIndex, direction) {
    const el = sections[toIndex];
    const fromIndex = currentIndex;
    const fromEl = sections[fromIndex];
    if (!el || isAnimating) return;
    
    const isToVisited = visitedSections.has(toIndex);
    const isFromVisited = visitedSections.has(fromIndex);
    
    // Si la sección destino ya fue visitada, solo hacer scroll directo sin animación
    if (isToVisited) {
      isAnimating = true;
      mainScrollContainer.scrollTo({ top: el.offsetTop, behavior: 'auto' });
      currentIndex = toIndex;
      setTimeout(() => {
        isAnimating = false;
        lastAnimationTime = Date.now();
      }, 50);
      return;
    }
    
    isAnimating = true;
    clearAllGhostStyles([fromIndex, toIndex]);
    setScrollLock(true);
    if (navbar) {
      if (toIndex > 0) { navbar.classList.remove('bg-transparent'); navbar.classList.add('bg-[#101010]'); }
      else { navbar.classList.add('bg-transparent'); navbar.classList.remove('bg-[#101010]'); }
    }
    
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.right = '0';
    el.style.bottom = '0';
    el.style.width = '100%';
    el.style.height = '100vh';
    el.style.zIndex = '40';
    el.style.opacity = '0.2';
    const startY = direction === 'down' ? '8%' : '-8%';
    el.style.transform = `translateY(${startY})`;
    const dur = 600; // 600ms
    const easing = 'cubic-bezier(0.87, 0, 0.13, 1)';
    el.style.transition = `transform ${dur}ms ${easing}, opacity ${dur}ms ease-out`;
    
    // Solo animar la sección origen si NO ha sido visitada
    if (fromEl && !isFromVisited) {
      fromEl.style.position = 'fixed';
      fromEl.style.top = '0';
      fromEl.style.left = '0';
      fromEl.style.right = '0';
      fromEl.style.bottom = '0';
      fromEl.style.width = '100%';
      fromEl.style.height = '100vh';
      fromEl.style.zIndex = '30';
      fromEl.style.transition = `transform ${dur}ms ${easing}, filter ${dur}ms ease-out, opacity ${dur}ms ease-out`;
      const exitY = direction === 'down' ? '-6%' : '6%';
      fromEl.style.transform = `translateY(${exitY})`;
      fromEl.style.filter = 'blur(0.5px)';
      fromEl.style.opacity = '0.9';
    }
    
    el.offsetHeight;
    if (fromEl && !isFromVisited) fromEl.offsetHeight;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
    });
    
    setTimeout(() => {
      // NUNCA limpiar estilos de secciones visitadas
      if (fromEl && !isFromVisited) {
        clearStyles(fromEl);
      }
      clearStyles(el);
      
      triggerSectionAnimations(el);
      visitedSections.add(toIndex); // Marcar como visitada
      
      mainScrollContainer.scrollTo({ top: el.offsetTop, behavior: 'auto' });
      
      setScrollLock(false);
      currentIndex = toIndex;
      isAnimating = false;
      lastAnimationTime = Date.now();
    }, dur + 50); // 650ms
    
    // Timeout de seguridad: si algo falla, resetear después de 2 segundos
    setTimeout(() => {
      if (isAnimating && sections[toIndex] === el) {
        // NO limpiar secciones visitadas
        if (!visitedSections.has(toIndex)) {
          clearStyles(el);
        }
        if (fromEl && sections[fromIndex] === fromEl && !visitedSections.has(fromIndex)) {
          clearStyles(fromEl);
        }
        isAnimating = false;
        setScrollLock(false);
        lastAnimationTime = Date.now();
      }
    }, 2000);
  }

  function goTo(index) {
    // Doble verificación: flag y timestamp
    if (isAnimating) return;
    
    const target = sections[Math.max(0, Math.min(index, sections.length - 1))];
    if (!target) return;
    
    const from = currentIndex;
    const to = sections.indexOf(target);
    if (to === from) return;
    
    // Verificación adicional de timestamp
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      return;
    }
        
    if (horizontalPairs.has(`${from}-${to}`)) {
      animateHorizontal(to, to > from ? 'right' : 'left');
      return; 
    }
    animateVertical(to, to > from ? 'down' : 'up');
  }

  handleWheelRef = function(e) {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden') && mobileMenu.contains(e.target)) { return; }
    
    e.preventDefault();
    
    // Verificación temprana: si ya hay una animación, ignorar
    if (isAnimating) return;
    
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      return; // Enfriamiento
    }
    
    const delta = e.deltaY || 0;
    
    if (delta > 5) { 
      goTo(currentIndex + 1);
    } else if (delta < -5) { 
      goTo(currentIndex - 1);
    }
  };

  handleKeyDownRef = function(e) {
    // Verificación temprana
    if (isAnimating) {
      e.preventDefault();
      return;
    }
    
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      e.preventDefault();
      return; 
    }
    
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { 
      e.preventDefault(); 
      goTo(currentIndex + 1); 
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { 
      e.preventDefault(); 
      goTo(currentIndex - 1); 
    }
  };

  handleTouchStartRef = function(e) {
    const mobileMenu = document.getElementById('mobile-menu');
    if ((mobileMenu && mobileMenu.contains(e.target))) { touchY = null; return; }
    
    if (isAnimating) {
      touchY = null;
      return;
    }
    
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      touchY = null;
      return;
    }
    touchY = e.touches[0].clientY;
  };

  handleTouchMoveRef = function(e) {
    if (touchY == null) return; 
    
    const dy = e.touches[0].clientY - touchY;
    
    if (Math.abs(dy) < 30) return;
    
    if (isAnimating) {
      e.preventDefault();
      touchY = null;
      return;
    }
    
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    
    if (dy < 0) {
      goTo(currentIndex + 1); 
    } else {
      goTo(currentIndex - 1);
    }
    touchY = null; 
  };

  handleAnchorClickRef = function(e) {
    e.preventDefault();
    
    if (isAnimating) {
      return;
    }
    
    const now = Date.now();
    if (now - lastAnimationTime < animationCooldown) {
      return; 
    }
    
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement && sections.includes(targetElement)) {
      const toIndex = sections.indexOf(targetElement);
      if (toIndex === currentIndex) return; 
      
      goTo(toIndex);
    }
  };

  mainScrollContainer.addEventListener('wheel', handleWheelRef, { passive: false });
  window.addEventListener('keydown', handleKeyDownRef);
  mainScrollContainer.addEventListener('touchstart', handleTouchStartRef, { passive: true });
  mainScrollContainer.addEventListener('touchmove', handleTouchMoveRef, { passive: false });
  scrollLinks = Array.from(document.querySelectorAll('a.scroll-link'));
  scrollLinks.forEach(link => { link.addEventListener('click', handleAnchorClickRef); });
  
  // Marcar la primera sección como visitada y animarla
  if (sections[0]) { 
    triggerSectionAnimations(sections[0]);
    visitedSections.add(0); // La primera sección ya está "visitada"
  }
  
  currentIndex = 0;
  lastAnimationTime = 0;
  isAnimating = false;
  
  if (sections[0]) { mainScrollContainer.scrollTo({ top: sections[0].offsetTop, behavior: 'auto' }); }
}


// --- Scripts de COLECCION ---
function initNavbarScroll() {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;
  navbarScrollHandler = () => {
    if (window.scrollY > 50) {
      navbar.classList.remove('bg-transparent');
      navbar.classList.add('bg-[#101010]');
    } else {
      navbar.classList.add('bg-transparent');
      navbar.classList.remove('bg-[#101010]');
    }
  };
  window.addEventListener('scroll', navbarScrollHandler);
  navbarScrollHandler(); 
}

function destroyNavbarScroll() {
  if (navbarScrollHandler) {
    window.removeEventListener('scroll', navbarScrollHandler);
    navbarScrollHandler = null;
  }
}

function initScrollAnimations() {
  function triggerAnimations(element) {
    if (!element) return;
    
    element.removeAttribute('data-animated');
    const animatedElements = Array.from(element.querySelectorAll('.anim-child'));
    if (animatedElements.length === 0) return;
    element.offsetHeight;
    
    animatedElements.forEach(el => {
      if (!el.classList.contains('opacity-0')) {
        const hasOpacity100 = el.classList.contains('opacity-100');
        el.classList.remove('opacity-100');
        el.classList.add('opacity-0');
        el.offsetHeight;
      }
      
      const delayClass = Array.from(el.classList).find(c => c.startsWith('delay-'));
      const delay = delayClass ? parseInt(delayClass.split('-')[1]) * 15 : 0;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            el.classList.add('transition-all', 'duration-500', 'ease-in-out');
            el.style.transitionDuration = '500ms';
            el.classList.remove('opacity-0');
            if (el.classList.contains('translate-y-4')) {
              el.classList.remove('translate-y-4');
            }
            if (el.classList.contains('-translate-x-8')) {
              el.classList.remove('-translate-x-8');
            }
            if (el.classList.contains('translate-x-8')) {
              el.classList.remove('translate-x-8');
            }
            el.classList.add('opacity-100'); 
          }, delay);
        });
      });
    });
    element.dataset.animated = 'true';
  }
  
  const mainContainer = document.querySelector('main[data-barba="container"]');
  if (mainContainer) {
    const allSections = mainContainer.querySelectorAll('section');
    allSections.forEach(section => {
      section.removeAttribute('data-animated');
      section.style.removeProperty('position');
      section.style.removeProperty('inset');
      section.style.removeProperty('transform');
      section.style.removeProperty('transition');
      section.style.removeProperty('z-index');
      section.style.removeProperty('opacity');
      section.style.removeProperty('filter');
      section.style.removeProperty('top');
      section.style.removeProperty('left');
      section.style.removeProperty('right');
      section.style.removeProperty('bottom');
      section.style.removeProperty('width');
      section.style.removeProperty('height');
    });
  }
  
  setTimeout(() => {
    const mainContainer = document.querySelector('main[data-barba="container"]');
    if (!mainContainer) return;
    
    const allSections = mainContainer.querySelectorAll('section');
    const heroSection = allSections[0];
    
    if (heroSection) {
      triggerAnimations(heroSection);
    }
    
    if (allSections.length > 1) {
      const productsSection = allSections[1];
      if (productsSection) {
        scrollAnimationsObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              triggerAnimations(entry.target);
              scrollAnimationsObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        scrollAnimationsObserver.observe(productsSection);
      }
    }
  }, 150);
}

function destroyScrollAnimations() {
  if (scrollAnimationsObserver) {
    scrollAnimationsObserver.disconnect();
    scrollAnimationsObserver = null;
  }
  const animatedSections = document.querySelectorAll('section[data-animated]');
  animatedSections.forEach(section => {
    section.removeAttribute('data-animated');
  });
}

function initParallaxCards() {
  const main = document.querySelector('main[data-barba="container"]');
  if (!main) return;

  const cards = main.querySelectorAll('.parallax-card');
  if (!cards.length) return;

  cards.forEach(card => {
    const image = card.querySelector('.parallax-image');
    if (!image) return;

    card.addEventListener('mouseleave', () => {
      image.style.transform = 'rotateY(0) rotateX(0) scale(1)';
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / 20;
      const y = (e.clientY - rect.top - rect.height / 2) / 20;

      image.style.transform = `rotateY(${x / 2}deg) rotateX(${-y / 2}deg) scale(1.05)`;
    });
  });
}

function reinitVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.pause();
    video.load();
    setTimeout(() => {
      video.play().catch(e => {
        console.log('Video autoplay prevented:', e);
        video.muted = true;
        video.play().catch(() => {});
      });
    }, 50);
  });
}

// ===============================================
// --- EL CEREBRO: BARBA.JS (El único `barba.init`) ---
// ===============================================

function runPageScripts(namespace) {
  initCart();
  initProductCards();
  if (namespace === 'home') {
    initIndexScroll();
    initCarousel();
    initParallaxCards();
    reinitVideos(); 
  } else if (namespace === 'coleccion') {
    initNavbarScroll();
    initScrollAnimations();
    initParallaxCards();
    reinitVideos(); 
  } else if (namespace === 'producto') {
    initNavbarScroll();
    initScrollAnimations();
    initParallaxCards();
    initProductDetailPage();
  }
}

barba.init({
  transitions: [{
    name: 'default-transition',
    async leave(data) {
      if (data.current.namespace === 'home') {
        destroyIndexScroll();
        const allSections = data.current.container.querySelectorAll('section');
        allSections.forEach(section => {
          section.style.removeProperty('position');
          section.style.removeProperty('inset');
          section.style.removeProperty('transform');
          section.style.removeProperty('transition');
          section.style.removeProperty('z-index');
          section.style.removeProperty('opacity');
          section.style.removeProperty('filter');
          section.style.removeProperty('top');
          section.style.removeProperty('left');
          section.style.removeProperty('right');
          section.style.removeProperty('bottom');
          section.style.removeProperty('width');
          section.style.removeProperty('height');
        });
      } else if (data.current.namespace === 'coleccion' || data.current.namespace === 'producto') {
        destroyNavbarScroll();
        if (data.current.namespace === 'coleccion') {
          destroyScrollAnimations();
        }
      }
      
      await new Promise(resolve => {
        data.current.container.style.transition = 'opacity 0.4s ease-out';
        data.current.container.style.opacity = 0;
        setTimeout(resolve, 400);
      });
    },
    async enter(data) {
      data.next.container.style.opacity = 0;
      data.next.container.offsetHeight; 
      data.next.container.style.transition = 'opacity 0.4s ease-in';
      data.next.container.style.opacity = 1;
      
      await new Promise(resolve => setTimeout(resolve, 400));
    },
    
    afterEnter(data) {
      data.next.container.style.opacity = '1';
      setTimeout(() => {
        initSimpleMobileMenu(); // Re-inicializar menú
        runPageScripts(data.next.namespace);
      }, 50);
    }
  }],

  // Esta lógica de 'views' es ahora MÁS importante que nunca
  views: [
    {
      namespace: 'home',
      // 'beforeEnter' se ejecuta en la carga inicial de la home
      // y cada vez que volvemos a la home
      beforeEnter() {
        // Forzamos el bloqueo de scroll
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
      },
      afterEnter() {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    },
    {
      namespace: 'coleccion',
      // 'beforeEnter' se ejecuta cada vez que entramos a una colección
      beforeEnter() {
        // Forzamos la LIBERACIÓN de scroll
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
      },
      afterEnter() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        window.scrollTo(0, 0);
      }
    },
    {
      namespace: 'producto',
      beforeEnter() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
      },
      afterEnter() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        window.scrollTo(0, 0);
      }
    }
  ]
});

// ===============================================
// --- CARGA INICIAL ---
// ===============================================

function runInitialLoad() {
  initSimpleMobileMenu();
  initCart();
  const mainContainer = document.querySelector('main[data-barba="container"]');
  if (mainContainer) {
    const initialNamespace = mainContainer.getAttribute('data-barba-namespace');
    if (initialNamespace) {
      runPageScripts(initialNamespace);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInitialLoad);
} else {
  runInitialLoad();
}