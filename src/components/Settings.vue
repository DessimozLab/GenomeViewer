<template>
  <div id="main_container" :class="{ 'sticky-top offset_oma': this.settings.oma, 'sticky-top': !this.settings.oma}">


    <div class="d-flex justify-content-end">

      <ButtonWithIcon
          id="button_modal"
          icon="bi bi-card-list"
          text='Selected genes'
          @click="showModal"
          class="align-left"
          v-if="hasSelectedGenes"
      />

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
          data-bs-target="#toggleDiv"
          data-bs-toggle="collapse"
          icon="bi bi-highlights"
          text="Color Legend"
      />

      <ButtonWithIcon
          class="me-2"
          icon="bi bi-camera"
          text="Export SVG"
          @click="emitEvent('export-svg')"
      />
      
      <ButtonWithIcon
          id="button_hide"
          :icon="hideIcon"
          text="Detail"
          @click="emitEvent('toggle-hide')"
      />
      
      <ButtonWithIcon
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

      <DropdownButton
          id="button_color_scheme"
          v-model="localColorScheme"
          :options="localColorList"
          icon="bi bi-palette2"
          text="Color Scheme"
          :no_default="true"
          :no_indicator="true"
          @change="emitEvent('update-color-scheme', $event)"
      />
      
      <VerticalTextDivider text="General"/>
      
      <DropdownButton
          id="button_color_overview"
          v-model="localColorAccessorOverview"
          :options="statesColorGenes"
          icon="bi bi-paint-bucket"
          text="Gene"
          @change="emitEvent('update-color-overview', $event)"
      />
      
      <DropdownButton
          id="button_height_overview"
          v-model="localHeightAccessorOverview"
          :options="statesColorGenes"
          icon="bi bi-arrows-vertical"
          text="Gene"
          @change="emitEvent('update-height-overview', $event)"
      />
      
      <VerticalTextDivider text="Overview"/>
      
      <DropdownButton
          id="button_color_excerpt"
          v-model="localColorAccessorExcerpt"
          :options="statesColorGenes"
          icon="bi bi-paint-bucket"
          text="Gene"
          @change="emitEvent('update-color-excerpt', $event)"
      />
      
      <DropdownButton
          id="button_height_excerpt"
          v-model="localHeightAccessorExcerpt"
          :options="statesColorGenes"
          icon="bi bi-arrows-vertical"
          text="Gene"
          @change="emitEvent('update-height-excerpt', $event)"
      />

      <DropdownButton
          id="button_color_edge_excerpt"
          v-model="localColorEdgeAccessorExcerpt"
          :options="statesColorGenes"
          icon="bi bi-paint-bucket"
          text="Edge"
          @change="emitEvent('update-color_edge-excerpt', $event)"
      />
      
      <VerticalTextDivider text="Excerpt"/>
      
    </div>
    <div id="toggleDiv" class="collapse text-center" style="margin:12px; padding: 24px;">
      <div >

        <ColorLegend
            ref="colorLegendOverview"
            id="color_legend_overview"
            :settings = "this.settings"
            :min_base="this.settings.data_metrics.numerical[localColorAccessorOverview].min"
            :max_base="this.settings.data_metrics.numerical[localColorAccessorOverview].max"
            :text='localColorAccessorOverview'
            v-if="this.localColorAccessorOverview"
            @update-extent="updateExtent"
        />

        <ColorLegend
            id="color_legend_local"
            :settings = "this.settings"
            :min_base="this.settings.data_metrics.numerical[localColorAccessorExcerpt].min"
            :max_base="this.settings.data_metrics.numerical[localColorAccessorExcerpt].max"
            :text='localColorAccessorExcerpt'
            v-if="this.localColorAccessorExcerpt"
            @update-extent="updateExtent"
        />

        <ColorLegend
            id="color_legend_edge"
            :settings = "this.settings"
            :min_base="this.settings.data_metrics.numerical[localColorEdgeAccessorExcerpt].min"
            :max_base="this.settings.data_metrics.numerical[localColorEdgeAccessorExcerpt].max"
            :text='localColorEdgeAccessorExcerpt'
            v-if="this.localColorEdgeAccessorExcerpt"
            @update-extent="updateExtent"
        />

        <ColorLegendVertical
            ref="heightLegendOverview"
            id="height_legend_overview"
            :settings = "this.settings"
            :min_base="this.settings.data_metrics.numerical[localHeightAccessorOverview].min"
            :max_base="this.settings.data_metrics.numerical[localHeightAccessorOverview].max"
            :text='localHeightAccessorOverview'
            v-if="this.localHeightAccessorOverview"
            @update-extent="updateExtent"
        />

        <ColorLegendVertical
            id="height_legend_excerpt"
            :settings = "this.settings"
            :min_base="this.settings.data_metrics.numerical[localHeightAccessorExcerpt].min"
            :max_base="this.settings.data_metrics.numerical[localHeightAccessorExcerpt].max"
            :text='localHeightAccessorExcerpt'
            v-if="this.localHeightAccessorExcerpt"
            @update-extent="updateExtent"
        />


      </div>
    </div>
  </div>
</template>

<script>
import VerticalTextDivider from './VerticalTextDivider.vue';
import ButtonWithIcon from './ButtonWithIcon.vue';
import DropdownButton from './DropdownButton.vue';
import SelectedGenesModal from './SelectedGenesModal.vue';
import ColorLegend from './ColorLegend.vue';
import ColorLegendVertical from './ColorLegendVertical.vue';


export default {
  name: 'SettingsUI',
  components: {
    VerticalTextDivider,
    ButtonWithIcon,
    DropdownButton,
    SelectedGenesModal,
    ColorLegend,
    ColorLegendVertical,
  },
  props: {
    settings_base: Object,
    statesColorGenes: Array,
  },
  data() {
    return {
      isModalVisible: false,
      settings : this.settings_base,
      localColorAccessorOverview: this.settings_base.colorAccessor_overview,
      localHeightAccessorOverview: this.settings_base.heightAccessor_overview,
      localColorAccessorExcerpt: this.settings_base.colorAccessor_excerpt,
      localHeightAccessorExcerpt: this.settings_base.heightAccessor_excerpt,
      localColorEdgeAccessorExcerpt : this.settings_base.colorAccessor_excerpt_edge,
      localColorScheme: this.settings_base.colorScheme,
      localColorList: Object.keys(this.settings_base.color_scheme_list),
    };
  },
  watch: {
    localColorAccessorOverview(newVal) {
      this.emitEvent('update-color-overview', newVal);
    },
    localHeightAccessorOverview(newVal) {
      this.emitEvent('update-height-overview', newVal);
    },
    localColorAccessorExcerpt(newVal) {
      this.emitEvent('update-color-excerpt', newVal);
    },
    localHeightAccessorExcerpt(newVal) {
      this.emitEvent('update-height-excerpt', newVal);
    },
    localColorEdgeAccessorExcerpt(newVal) {
      this.emitEvent('update-color-excerpt_edge', newVal);
    },
    localColorScheme(newVal) {
      this.emitEvent('update-color-scheme', newVal);
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
      return 'Sort by ' + (this.settings.sorting_chromosome === 'size' ? 'Size' : this.settings.sorting_chromosome === 'number_genes' ? 'Genes' : 'Name');
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
    updateExtent({ min, max, steps }) {
      this.settings.data_metrics.numerical[this.localColorAccessorOverview].min = min;
      this.settings.data_metrics.numerical[this.localColorAccessorOverview].max = max;
      this.settings.data_metrics.numerical[this.localColorAccessorOverview].steps = steps;
    }

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

.align-left {
  margin-right: auto !important;
}
</style>