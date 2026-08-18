<template>

  <div id="main_container" :class="{ 'sticky-top offset_oma': this.settings.oma, 'sticky-top': !this.settings.oma}">


    <div class="d-flex justify-content-end">

      <ButtonWithIcon
          id="button_modal"
          icon="bi bi-card-list"
          text='Selected genes'
          @click="showModal"
          class="me-auto"
          v-if="hasSelectedGenes"
      />

      <!-- Search bar and button -->
      <div class="input-group me-2 " style="width: 300px">
        <input type="text" class="form-control" v-model="searchQuery" placeholder="Search..." style="height: 100%;">
        <button class="btn btn-outline-dark" type="button" v-if="settings.searchQueries.length > 0" @click="clearHighlights">Clear</button>
        <button class="btn btn-outline-dark" type="button" @click="handleSearch" style="height: 100%;">Highlight</button>
      </div>

      <SelectedGenesModal
          v-if="isModalVisible"
          :selectedGenes="selectedGenes"
          :settings="settings"
          @close="hideModal"
      />

      <ButtonWithIcon
          v-if="isNotAncestral"
          id="button_type"
          :icon="typeIcon"
          :text="typeText"
          @click="emitEvent('toggle-type')"
      />


      <ButtonWithIcon
          class="me-2"
          icon="bi bi-camera"
          text="Export SVG"
          @click="emitEvent('export-svg')"
      />

      <ButtonWithIcon
          v-if="!settings.hide_detail_button"
          id="button_hide"
          :icon="hideIcon"
          text="Detail"
          @click="emitEvent('toggle-hide')"
      />

      <ButtonWithIcon
          v-if="!settings.hide_sorting_button"
          id="button_sorting"
          :icon="sortingIcon"
          :text="sortingText"
          @click="emitEvent('toggle-sorting')"
      />

      <ButtonWithIcon
          id="button_selection"
          :text="modeText"
          icon="bi bi-hand-index"
          @click="emitEvent('toggle-mode')"
      />

      <ButtonWithIcon
          class="me-2"
          data-bs-target="#toggleDiv"
          data-bs-toggle="collapse"
          icon="bi bi-highlights"
          text="Legend"
      />

    </div>

    <div id="toggleDiv" ref="toggleDiv" class="collapse show" style="margin:12px; padding: 24px; background-color: rgba(200,200,200,0.1)">

      <div class="legend-toolbar">
        <button
            type="button"
            class="btn btn-sm btn-link legend-violin-toggle"
            :class="{ active: showViolin }"
            @click="showViolin = !showViolin"
            :title="showViolin ? 'Hide distribution plot' : 'Show distribution plot'"
        >
          <i class="bi bi-sliders"></i>
        </button>
      </div>

      <div class="legend-grid">

        <LegendColorRow
            id="button_color"
            ref="legendColorRow"
            label="Gene color"
            v-model:accessor="localColorAccessor"
            :options="statesColorGenes"
            :settings="settings"
            :showViolin="showViolin"
            @update-extent="updateExtent"
            @update-color-scheme="onColorSchemeChange"
        />

        <LegendColorRow
            id="button_color_edge"
            label="Edge color"
            v-model:accessor="localColorAccessorEdge"
            :options="statesColorGenes"
            :forEdge="true"
            :settings="settings"
            :showViolin="showViolin"
            @update-extent="updateExtent"
            @update-color-scheme="onColorSchemeChange"
        />

        <LegendHeightRow
            id="button_height"
            ref="legendHeightRow"
            v-model:accessor="localHeightAccessor"
            :options="statesColorGenes"
            :settings="settings"
            :showViolin="showViolin"
            @update-extent="updateExtent"
        />

      </div>

    </div>


  </div>
</template>

<script>
import ButtonWithIcon from './ButtonWithIcon.vue';
import SelectedGenesModal from './SelectedGenesModal.vue';
import LegendColorRow from './LegendColorRow.vue';
import LegendHeightRow from './LegendHeightRow.vue';


export default {
  name: 'SettingsUI',
  components: {
    ButtonWithIcon,
    SelectedGenesModal,
    LegendColorRow,
    LegendHeightRow,
  },
  props: {
    settings_base: Object,
    statesColorGenes: Array,
  },
  data() {
    return {
      isModalVisible: false,
      searchQuery: '',
      settings : this.settings_base,
      localColorAccessor: this.settings_base.colorAccessor,
      localHeightAccessor: this.settings_base.heightAccessor,
      localColorAccessorEdge: this.settings_base.colorAccessor_edge,
      // legend collapse starts open ("collapse show" on #toggleDiv below), kept in sync via the
      // bs.collapse events attached in mounted() so the Legend button's pressed state tracks the
      // actual panel state rather than duplicating Bootstrap's own open/closed logic
      legendOpen: true,
      showViolin: true,
    };
  },
  watch: {
    localColorAccessor(newVal) {
      this.emitEvent('update-color', newVal);
    },
    localHeightAccessor(newVal) {
      this.emitEvent('update-height', newVal);
    },
    localColorAccessorEdge(newVal) {
      this.emitEvent('update-color-edge', newVal);
    },
  },
  computed: {
    // GETTER
    hasSelectedGenes() {
      return this.selectedGenes.length > 0;
    },
    isNotAncestral() {
      return this.settings.type_chromosome !== 'ancestral';
    },
    d_start() {
      return this.settings.type_position === 'loci' ? d => d.start : d => d.index
    },
    d_end() {
      return this.settings.type_position === 'loci' ? d => d.end : d => d.index + 0.5
    },
    typeIcon() {
      return this.settings.type_position === 'loci' ? 'bi bi-rulers' : 'bi bi-rulers';
    },
    typeText() {
      return this.settings.type_position === 'loci' ? 'Locus' : 'Fixed';
    },
    hideIcon() {
      return this.settings.hide ? 'bi bi-eye-slash' : 'bi bi-eye-fill';
    },
    sortingIcon() {
      return this.settings.sorting_chromosome === 'size' ? 'bi bi-sort-up' : this.settings.sorting_chromosome === 'number_genes' ? 'bi bi-sort-numeric-up-alt' : 'bi bi-sort-alpha-up';
    },
    sortingText() {
      return 'Sort by ' + (this.settings.sorting_chromosome === 'size' ? 'Size' : this.settings.sorting_chromosome === 'number_genes' ? 'Nbr Genes' : 'Name');
    },
    modeText() {
      return this.settings.mode === 'zoom' ? 'Zoom/Pan' : 'Selection';
    },
    selectedGenes() {
      return this.$parent.sortedData.flatMap(datum =>
          datum.nodes.filter(node =>
            {
              return datum.selectedRegions.some(([x0, x1]) => {
                if (this.d_start(node)>= x0 && this.d_start(node) <= x1){
                  return true
                }

                return false
              }
              )
            }
          )
      );
    },
  },
  methods: {

    clearHighlights() {
      this.settings.searchQueries.forEach(rect => {
        rect.removeAttribute('stroke');
        rect.removeAttribute('stroke-width');
      });
      this.settings.searchQueries = [];
    },
    // EVENTS
    emitEvent(eventType, payload = null) {
      this.$emit('settings-event', {eventType, payload});
    },

    // UI INTERACTIONS
    showModal() {
      this.isModalVisible = true;
    },
    hideModal() {
      this.isModalVisible = false;
    },
    updateExtent({ min, max, accessor }) {
      this.settings.data_metrics.numerical[accessor].min = min;
      this.settings.data_metrics.numerical[accessor].max = max;
    },
    onColorSchemeChange({ key, value }) {
      this.settings[key] = value;
    },
    handleSearch() {
      this.emitEvent('search', this.searchQuery);

    },

  },
  emits: ['settings-event'],
}
</script>

<style scoped>

.offset_oma {
  top: 192px;
}
#main_container {
  z-index: 1000;
  background-color: white;
  padding: 12px;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 8px 32px;
}

@media (max-width: 720px) {
  .legend-grid {
    grid-template-columns: 1fr;
  }
}

</style>
