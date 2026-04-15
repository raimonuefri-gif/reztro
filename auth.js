/* ============================================
   ReZtro — Authentication (Supabase)
   ============================================ */

const Auth = {
    SESSION_KEY: 'reztro_session',

    /* ---------- REGISTER ---------- */
    async register(formData) {
        // 1. Check if restaurant email already exists in restaurants table
        const { data: existing } = await _supabase
            .from('restaurants')
            .select('id')
            .eq('email', formData.email)
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'Ya existe una cuenta con este correo electrónico.' };
        }

        // 2. Insert restaurant record
        const { data: restaurant, error } = await _supabase
            .from('restaurants')
            .insert([{
                name:         formData.name,
                manager_name: formData.manager_name || formData.name,
                phone:        formData.phone,
                address:      formData.address,
                email:        formData.email,
                password:     formData.password,
                category:     formData.category,
                hours:        formData.hours || 'Sin definir',
                logo:         formData.logo || ''
            }])
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        this.setSession(restaurant);
        return { success: true, restaurant };
    },

    /* ---------- LOGIN ---------- */
    async login(email, password) {
        const { data: restaurant, error } = await _supabase
            .from('restaurants')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .maybeSingle();

        if (error || !restaurant) {
            return { success: false, error: 'Correo o contraseña incorrectos.' };
        }

        this.setSession(restaurant);
        return { success: true, restaurant };
    },

    /* ---------- SESSION ---------- */
    setSession(restaurant) {
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
            id:    restaurant.id,
            name:  restaurant.name,
            email: restaurant.email,
            logo:  restaurant.logo || ''
        }));
    },

    getSession() {
        const data = sessionStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    async getCurrentRestaurant() {
        const session = this.getSession();
        if (!session) return null;
        const { data } = await _supabase
            .from('restaurants')
            .select('*')
            .eq('id', session.id)
            .single();
        return data;
    },

    isLoggedIn() {
        return this.getSession() !== null;
    },

    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'register.html';
            return false;
        }
        return true;
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'register.html';
    }
};
