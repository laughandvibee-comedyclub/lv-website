const supabaseClient = window.supabaseClient;

function artistMarketplace() {
    return {
        artists: [],
        filtered: [],
        filters: [],
        categories: [],
        categoryMap: {},
        performanceTypes: [],
        performanceMap: {},
        selectedFilter: { id: "all", type: "all", name: "All" },
        page: 1,
        perPage: 6,

        async init() {
            await this.loadFilters();
            await this.loadArtists();
        },

        async loadFilters() {
            /* categories */
            const { data: categories = [] } = await supabaseClient
                .from("categories")
                .select("id,name");

            /* performance types */
            const { data: perfTypes = [] } = await supabaseClient
                .from("performance_types")
                .select("id,name");

            this.filters = [
                { id: "all", type: "all", name: "All" },

                ...categories.map(c => ({
                    id: String(c.id),
                    type: "category",
                    name: c.name
                })),

                ...perfTypes.map(p => ({
                    id: String(p.id),
                    type: "performance",
                    name: p.name
                }))
            ];

            categories.forEach(c => {
                this.categoryMap[String(c.id)] = c.name;
            });

            perfTypes.forEach(p => {
                this.performanceMap[String(p.id)] = p.name;
            });
        },

        /* ================= ARTISTS ================= */
        async loadArtists() {
            /* --- Load artists + profiles --- */
            const { data: artistsData, error } = await supabaseClient
                .from("artists")
                .select(`
          artist_code,
          category_ids,
          performance_type_ids,
          user_id,
          profiles_public (
            id,
            full_name
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: true });

            if (error) {
                console.error(error);
                return;
            }

            if (!artistsData || artistsData.length === 0) {
                console.warn("No artists found");
                return;
            }

            /* --- Collect user IDs --- */
            const userIds = artistsData.map(a => a.user_id);

            /* --- Load profile media --- */
            const { data: mediaData, error: mediaError } =
                await supabaseClient
                    .from("artist_media")
                    .select("user_id, media_url")
                    .in("user_id", userIds)
                    .eq("media_type", "profile");

            if (mediaError) {
                console.error(mediaError);
            }

            // get publicUrl of profile images
            function getPublicImageUrl(path) {
                const { data } = supabaseClient.storage
                    .from("artist-media")
                    .getPublicUrl(path);

                return data.publicUrl;
            }

            /* --- Build media map --- */
            const mediaMap = {};
            (mediaData || []).forEach(m => {
                mediaMap[m.user_id] = getPublicImageUrl(m.media_url);
            });

            /* --- Final UI objects --- */
            this.artists = artistsData.map(a => {
                const categoryIds = a.category_ids || [];
                const performanceTypeIds = a.performance_type_ids || [];

                return {
                    artist_code: a.artist_code,
                    category_ids: categoryIds,
                    performance_type_ids: performanceTypeIds,
                    name: a.profiles_public?.full_name || "Unknown",

                    categoryNames: categoryIds
                        .map(id => this.categoryMap[String(id)])
                        .filter(Boolean)
                        .join(" / "),

                    performanceTypes: performanceTypeIds
                        .map(id => this.performanceMap[String(id)])
                        .filter(Boolean),

                    profile_image: mediaMap[a.user_id] || "/assets/images/placeholders/profile-preview-placeholder.webp"
                };
            });

            this.applyFilter();
        },

        /* ================= FILTERING ================= */
        setCategory(cat) {
            this.selectedCategory = cat;
            this.page = 1;
            this.applyFilter();
        },

        applyFilter() {
            if (this.selectedFilter.type === "all") {
                this.filtered = this.artists;
                return;
            }

            if (this.selectedFilter.type === "category") {
                this.filtered = this.artists.filter(a =>
                    a.category_ids.includes(this.selectedFilter.id)
                );
                return;
            }

            if (this.selectedFilter.type === "performance") {
                this.filtered = this.artists.filter(a =>
                    a.performance_type_ids.includes(
                        this.selectedFilter.id
                    )
                );
            }
        },

        /* ================= PAGINATION ================= */
        get totalPages() {
            return Math.max(
                1,
                Math.ceil(this.filtered.length / this.perPage)
            );
        },

        get paginatedArtists() {
            const start = (this.page - 1) * this.perPage;
            return this.filtered.slice(start, start + this.perPage);
        },

        visiblePages() {
            const total = this.totalPages;
            const current = this.page;
            const pages = [];

            let start = Math.max(1, current - 3);
            let end = Math.min(total, current + 3);

            if (current <= 4) end = Math.min(total, 7);
            if (current > total - 4) start = Math.max(1, total - 6);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            return pages;
        },

        /* ================= NAVIGATION ================= */
        openArtist(code) {
            window.open(
                `./solo-artist.html?artist_code=${code}`,
                "_blank"
            );
        }
    };
}