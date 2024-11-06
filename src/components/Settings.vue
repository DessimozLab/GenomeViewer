<template>
  <div id="main_container" class="sticky-top">
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
          icon="bi bi-funnel"
          text="Filter"
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
    <div id="toggleDiv" class="collapse text-center" style="margin:24px; padding: 50px; border: #dddddd 1px solid">
      <b>Place holder for filtering widget.</b>
    </div>
  </div>
</template>

<script>
import VerticalTextDivider from './VerticalTextDivider.vue';
import ButtonWithIcon from './ButtonWithIcon.vue';
import DropdownButton from './DropdownButton.vue';
import SelectedGenesModal from './SelectedGenesModal.vue';


export default {
  name: 'SettingsUI',
  components: {
    VerticalTextDivider,
    ButtonWithIcon,
    DropdownButton,
    SelectedGenesModal
  },
  props: {
    settings: Object,
    statesColorGenes: Array,
  },
  data() {
    return {
      isModalVisible: false,
      localColorAccessorOverview: this.settings.colorAccessor_overview,
      localHeightAccessorOverview: this.settings.heightAccessor_overview,
      localColorAccessorExcerpt: this.settings.colorAccessor_excerpt,
      localHeightAccessorExcerpt: this.settings.heightAccessor_excerpt,
      localColorEdgeAccessorExcerpt : this.settings.colorAccessor_excerpt_edge
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
    }

  },
  emits: ['settings-event'],
}
</script>

<style scoped>
#main_container {
  z-index: 1000;
  background-color: white;
  padding: 12px;
}

.align-left {
  margin-right: auto !important;
}
</style>