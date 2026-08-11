<template>




 <div ref="interface_chr_small_container" id="interface_chr_small_container"  >

   <div id="interface_chr_small_container_div">
     <div style="margin-right: auto; display: flex">

       <p id="chromosome_name" >{{chromosome_name}}</p>

       <p  style="font-size: small; align-self: end" id="chromosome_genes_desc" >{{chromosome_genes_desc}}</p>

       <!-- Add button if genes are selected that remove all seelcted genes in this chromsome call unselect all-->
        <ButtonWithIcon
            buttonStyle="padding: 6px; height: 29px; margin-right: 8px; margin-left: 8px;"
            id="unselect_all"
            icon="null"
            text="Unselect Genes"
            @click="this.emitEvent('unselect-all')"
            v-if="this.get_selected_genes(this.datum.nodes).length > 0"
        />


     </div>

     <div style="margin-left: auto">

       <ButtonWithIcon
           id="download_svg"
           icon="null"
           text=".SVG"
           @click="this.downloadSVG"
       />

       <ButtonWithIcon
           id="download_png"
           icon="null"
           text=".PNG"
           @click="this.downloadPNG"
       />

     </div>

   </div>



   <svg ref="svg_overview" :width="CurrentWidth" style="border: 1px lightgray solid; border-radius: 18px;" :height="settings.svgHeight_overview" class="svg-element" ></svg>

   <svg ref="svg_mapper" :width="parentWidth" :height="settings.svgHeight_mapper" class="svg-element" ></svg>

   <svg ref="svg_excerpt" :width="parentWidth" :height="settings.svgHeight" class="svg-element"></svg>

   <div v-if="menuVisible" ref="menuEl" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }" class="menu">

     <div class="tooltip__content__item">
       <button class="close-button" @click="hideMenu">&times;</button>
     </div>

     <div v-for="item in menuContent" :key="item.id" :style="item.inline ? 'display: inline-block; margin-right: 6px; margin-bottom: 6px;' : 'margin-right: 36px'">
       <div class="tooltip__content__item">
         <div :style=item.style :class="item.class" @click="item.click" v-html="item.content"></div>
       </div>
     </div>
   </div>


 </div>

</template>

<script>

import * as d3 from 'd3';
import ButtonWithIcon from './ButtonWithIcon.vue';

export default {
  name: 'ChromosomeViewer',
  components: {
    ButtonWithIcon,
  },
  props: {
    datum: Object,
    settings: Object,
    domain_max: Number,
  },
  watch: {

    'settings.data_metrics.numerical': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'datum.unique_id': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'domain_max': {
      handler: function () {
        this.CurrentWidth = this.getCurrentWidth()
        this.update_renders()

      },
      deep: true
    },
    'settings': {
      handler: function () {
        this.update_renders()

      },
      deep: true
    },
    'settings.mode': {
      handler: function () {
        this.CurrentWidth = this.getCurrentWidth()
        this.update_renders()

      },
      deep: true
    },
    'settings.hide': {
      handler: function () {
        this.toggleSvgDisplay()
      },
      deep: true
    },
    'settings.colorAccessor': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
    'settings.heightAccessor': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'settings.color_scheme': {
      handler: function () {
        this.color_scheme = this.settings.color_scheme_list[this.settings.color_scheme]
        this.update_renders()
      },
      deep: true
    },
    'settings.color_scheme_edge': {
      handler: function () {
        this.color_scheme_edge = this.settings.color_scheme_list[this.settings.color_scheme_edge]
        this.update_renders()
      },
      deep: true
    },
    'settings.colorAccessor_edge': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
    menuVisible(isVisible) {
      if (isVisible) {
        // deferred to the next macrotask so the click that just opened the menu (still
        // bubbling up to document at this point) doesn't immediately trigger its own close
        setTimeout(() => document.addEventListener('click', this.handleClickOutside), 0)
      } else {
        document.removeEventListener('click', this.handleClickOutside)
      }
    },
  },
  computed: {
    // SCALE
    color_scale() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .clamp(true)
          .interpolator(this.color_scheme);
    },
    color_scale_edge() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_edge]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .clamp(true)
          .interpolator(this.color_scheme_edge);
    },

    // GETTER
    domain_max_current() {
      // must use d_end, not the raw start/index field, or the rightmost gene's start pins the
      // domain max and it collapses to zero width on screen (invisible)
      return Math.max(...this.datum.nodes.map(d => this.d_end(d)))
    },
    domain_min_current() {
      return Math.min(...this.datum.nodes.map(d => this.d_start(d)))
    },
    chromosome_name() {
      return this.datum.name
    },
    chromosome_genes_desc() {

      var s = this.get_selected_genes(this.datum.nodes).length

      var desc = this.datum.nodes.length + (this.datum.type === 'ancestral' ? " ancestral genes " : " genes ")

      if (s > 0) {
        desc += "( " + s + " selected )"
      }

      if (this.datum.type === 'extant') {
        desc += "- " + this.pretty_locus(this.datum.size_in_bp) + " bp"
      }

      return desc

    },
    d_start() {
      return this.settings.type_position === 'loci' ? d => d.start : d => d.index
    },
    d_end() {
      return this.settings.type_position === 'loci' ? d => d.end : d => d.index + 0.5
    },
    show_direction_triangles() {
      return !!(this.settings.data_metrics.categorical && this.settings.data_metrics.categorical['strand']);
    },
  },
  methods: {
    update_renders() {
      this.render_overview()
      this.render_mapper()
      this.render_excerpt()
    },
    callback_click_synteny(test) {
      return this.settings.callback_click_synteny(test)
    },
    callback_click_detail(test) {
      return  this.settings.callback_click_detail(test)
    },
    callback_click_members(test) {
      return  this.settings.callback_click_members(test)
    },
    combineSVGs() {
      const svgElements = [
        this.$refs.svg_overview,
        this.$refs.svg_mapper,
        this.$refs.svg_excerpt
      ];

      const padding = 10; // Add padding
      const combinedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      combinedSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      combinedSVG.setAttribute("width", this.parentWidth + padding * 2);
      combinedSVG.setAttribute("height", this.settings.svgHeight_overview + this.settings.svgHeight_mapper + this.settings.svgHeight + padding * 2);

      let yOffset = padding;
      svgElements.forEach(svg => {
        const clonedSVG = svg.cloneNode(true);
        clonedSVG.setAttribute("y", yOffset);
        clonedSVG.setAttribute("x", padding); // Add padding to x position
        combinedSVG.appendChild(clonedSVG);
        yOffset += parseFloat(svg.getAttribute("height"));
      });

      return combinedSVG;
    },
    downloadSVG() {
      const combinedSVG = this.combineSVGs();
      const serializer = new XMLSerializer();
      const svgBlob = new Blob([serializer.serializeToString(combinedSVG)], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "chromosome_viewer_" + this.chromosome_name + ".svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    downloadPNG() {
      const combinedSVG = this.combineSVGs();
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(combinedSVG);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = new Image();

      canvas.width = combinedSVG.getAttribute("width");
      canvas.height = combinedSVG.getAttribute("height");

      // Set the background color to white
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);


      img.onload = () => {
        context.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "chromosome_viewer_" + this.chromosome_name + ".png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, "image/png");
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    },

    // RENDER
    applyDefaultExcerptZoom() {
      // only kicks in on first mount, while currentZoom is still untouched by the user
      if (this.datum.currentZoom.k !== 1 || this.datum.currentZoom.x !== 0) {
        return
      }

      const windowSize = this.settings.default_excerpt_window_genes
      if (!windowSize || this.datum.nodes.length <= windowSize) {
        return
      }

      const mid = Math.floor(this.datum.nodes.length / 2)
      const half = Math.floor(windowSize / 2)
      const startIdx = Math.max(0, mid - half)
      const endIdx = Math.min(this.datum.nodes.length - 1, startIdx + windowSize - 1)

      const scale = d3.scaleLinear().domain([this.domain_min_current, this.domain_max_current]).range([0, this.parentWidth])
      const x0 = scale(this.d_start(this.datum.nodes[startIdx]))
      const x1 = scale(this.d_end(this.datum.nodes[endIdx]))

      if (x1 <= x0) {
        return
      }

      const k = this.parentWidth / (x1 - x0)
      this.emitEvent('updateZoom', d3.zoomIdentity.scale(k).translate(-x0, 0))
    },
    render_mapper() {

      const scale_overview = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);

      var svg_mapper = d3.select(this.$refs.svg_mapper)


      svg_mapper.selectAll('.line_top')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_top')
                  .attr('x1', (d) => scale_overview(d) + 1)
                  .attr('y1', 0)
                  .attr('x2', (d) => scale_overview(d) + 1)
                  .attr('y2', 10)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', (d) => scale_overview(d) + 1)
                  .attr('x2', (d) => scale_overview(d) + 1)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      svg_mapper.selectAll('.line_bottom')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_bottom')
                  .attr('x1', (d) => scale_overview(d) + 1)
                  .attr('y1', 22)
                  .attr('x2', (d) => scale_overview(d) + 1)
                  .attr('y2', 32)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', (d) => scale_overview(d) + 1)
                  .attr('x2', (d) => scale_overview(d) + 1)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      svg_mapper.selectAll('text')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('text')
                  .attr('x', d => scale_overview(d))
                  .attr('y', 20) // Position the text 20 pixels below the line
                  .text(d => this.pretty_locus(d))// Set the text to the inverted scale value of max
                  .attr('font-size', '10px')
                  .attr('text-anchor', d => this.set_anchor_position(d)),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale_overview(d))
                  .attr('y', 20) // Position the text 20 pixels below the line
                  .text(d => this.pretty_locus(d))// Set the text to the inverted scale value of max
                  .attr('font-size', '10px')
                  .attr('text-anchor', d => this.set_anchor_position(d)),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      svg_mapper.selectAll('.line_diag')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_diag')
                  .attr('x1', (d, i) => scale_overview(d) + (i === 0 ? 1 : 1))
                  .attr('y1', 32)
                  .attr('x2', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                  .attr('y2', 42)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', (d, i) => scale_overview(d) + (i === 0 ? 1 : 1))
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      // add line beneath rectangles section to show wich part is selected in excerpt
      const scaleline = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);

      svg_mapper.selectAll('.line_selected')
          .data(this.datum.selectedRegions) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_selected')
                  .attr('x1', d => scaleline(d[0]))
                  .attr('y1', 3)
                  .attr('x2', d => scaleline(d[1]))
                  .attr('y2', 3)
                  .attr('stroke', this.settings.selected_gene_color)
                  .attr('opacity', 1)
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', d => scaleline(d[0]))
                  .attr('x2', d => scaleline(d[1])),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


    },
    render_overview( ) {

      const scale = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth]);
      const scale_height = this.set_height_gene_overview_scale()

      var svg_overview = d3.select(this.$refs.svg_overview)

      svg_overview.selectAll('rect')
          .data(this.datum.nodes) // Bind the data to the rectangles
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('id', d => d.id)
                  .attr('opacity', 0.8)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr("fill", this.color_gene_overview)
                  .attr('transform', d => {
                    if (this.settings.heightAccessor == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor])
                      return `translate( 0,${y})`
                    }
                  }),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr('transform', d => {
                    if (this.settings.heightAccessor == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor])
                      return `translate(0, ${y})`
                    }
                  })
                  .attr("fill", this.color_gene_overview),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      const scaleline = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);
      svg_overview.selectAll('line')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_extent_overview')
                  .attr('x1', d => scaleline(d))
                  .attr('y1', 0)
                  .attr('x2', d => scaleline(d))
                  .attr('y2', this.settings.svgHeight_overview)
                  .attr('stroke', 'grey')
                  .attr('opacity', this.settings.hide ? 0 : 1)
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', d => scaleline(d))
                  .attr('y1', 0)
                  .attr('x2', d => scaleline(d))
                  .attr('y2', this.settings.svgHeight_overview)
                  .attr('stroke', 'grey')
                  .attr('opacity', this.settings.hide ? 0 : 1)
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );



    },
    render_excerpt( ) {

      const scale = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.parentWidth]);

      const scale_height = this.set_height_gene_excerpt_scale()

      var svg_excerpt = d3.select(this.$refs.svg_excerpt)



      svg_excerpt.selectAll('rect')
          .data(this.datum.nodes) //.filter(d => this.d_start(d) >= this.datum.domain[0] && this.d_end(d) <= this.datum.domain[1]))
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', this.margin_top_svg)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  // acts as an invisible click hit-area under the visible direction arrow, so the
                  // whole gene footprint stays clickable once the arrow replaces the box visually
                  .attr('opacity', d => this.has_direction_arrow(d) ? 0 : 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', this.margin_top_svg)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr('opacity', d => this.has_direction_arrow(d) ? 0 : 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      svg_excerpt.selectAll('.line_between_right')
          .data(this.datum.nodes.slice(0, this.datum.nodes.length - 1))
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_between_right')
                  .attr('x1', (d) => scale(this.d_end(d)))
                  .attr('y1', this.settings.svgHeight / 2)
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i + 1])))
                  .attr('y2',this.settings.svgHeight / 2)
                  .attr('stroke', d =>  this.color_edge_excerpt(d))
                  .attr('stroke-width', this.settings.edge_height)
                  .attr('cursor', 'pointer')
                  .on('click', (event, d) => this.showEdgeMenu(event, d, this.datum.nodes[d.index + 1])),
              update => update
                  .attr('x1', (d) => scale(this.d_end(d)))
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i + 1])))
                  .attr('stroke',d =>  this.color_edge_excerpt(d))
                  .on('click', (event, d) => this.showEdgeMenu(event, d, this.datum.nodes[d.index + 1])),
              exit => exit.remove()
          );

      svg_excerpt.selectAll('.line_extend')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_diag')
                  .attr('x1', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                  .attr('y1', 0)
                  .attr('x2', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                  .attr('y2', 20)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
          );

      // painted last so the direction arrows stay in front of the (now invisible) gene rects and the edge lines
      svg_excerpt.selectAll('.gene_direction_triangle')
          .data(this.datum.nodes.filter(d => this.has_direction_arrow(d)))
          .join(
              enter => enter.append('path')
                  .attr('class', 'gene_direction_triangle')
                  .attr('d', d => this.direction_triangle_path(scale, scale_height, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('opacity', 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              update => update
                  .attr('d', d => this.direction_triangle_path(scale, scale_height, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              exit => exit.remove()
          );


      // Define the zoomed function
      var zoomed = (event) => {
        // Get the new scale
        var newScale = event.transform.rescaleX(scale);

        // Update the rectangles with the new scale
        const [x0, x1] = newScale.domain();


        this.emitEvent('domainChanged', [x0, x1]);
        this.emitEvent('updateZoom', event.transform);

        this.render_overview()
        this.render_mapper()



        svg_excerpt.selectAll('rect')
            .attr('x', d => newScale(this.d_start(d)))
            .attr('width', d => newScale(this.d_end(d)) - newScale(this.d_start(d)));

        svg_excerpt.selectAll('.line_between_right')
            .attr('x1', (d) => newScale(this.d_end(d)))
            .attr('x2', (d,i) => newScale(this.d_start(this.datum.nodes[i+1])))

        svg_excerpt.selectAll('.gene_direction_triangle')
            .attr('d', d => this.direction_triangle_path(newScale, scale_height, d));

      };


      // Create the zoom behavior
      var zoom = d3.zoom()
          .scaleExtent([1, Infinity]) // This controls the zoom limit. [1, Infinity] means it can only zoom in.
          .translateExtent([[scale(0), 0], [scale(this.domain_max), 0]]) // This controls the panning limit.
          .on('zoom', zoomed); // This sets the function to be called when a zoom event occurs.

      svg_excerpt.call(zoom);

      if (this.datum.currentZoom) {
        svg_excerpt.call(zoom.transform, this.datum.currentZoom);
      }


      var brushed = (event) => {

        if (event.sourceEvent == null) {
          return
        }

        const selection = event.selection;

        if (selection === null) {
          console.log('Brush cleared')
        } else {


          var newScale = this.datum.currentZoom.rescaleX(scale);
          const [x0, x1] = selection.map(newScale.invert);
          this.emitEvent('addSelectedRegions', [x0, x1]);
          this.render_excerpt();
          this.render_mapper()
          this.render_overview();
        }

        svg_excerpt.call(brush.move, null);

      }

      var brush = d3.brushX()
          .extent([[0, 0], [this.parentWidth, this.settings.svgHeight]])
          .on("end", brushed)


      if (this.settings.mode === 'zoom') {
        // Remove the brush behavior and apply the zoom behavior
        svg_excerpt.on('.brush', null);
        svg_excerpt.call(zoom);
      } else {
        // Remove the zoom behavior and apply the brush behavior
        svg_excerpt.on('.zoom', null);
        svg_excerpt.call(brush);
      }


    },


    // SCALE & COLOR
    color_gene_overview(d) {

      if (this.settings.colorAccessor === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale(d.data[this.settings.colorAccessor])

    },
    set_height_gene_overview_scale() {

      if (this.settings.heightAccessor === null) {
        return this.settings.svgHeight_overview;
      } else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor]
        return d3.scaleLinear().clamp(true).domain([extent.min, extent.max]).range([0, this.settings.svgHeight_overview]);
      }

    },
    color_gene_excerpt(d) {


      if (this.settings.searchQueriesIds.includes(d.id)) {
        return 'red';
      }

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale(d.data[this.settings.colorAccessor])

    },
    color_edge_excerpt(d) {

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor_edge === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale_edge(d.data[this.settings.colorAccessor_edge])

    },
    gene_height_excerpt(scale_height, d) {
      return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
    },
    gene_vertical_transform(scale_height, d) {
      // centers the gene (and its direction triangle, via the same formula) on the edge line at svgHeight/2,
      // rather than anchoring it to the bottom of the excerpt
      if (this.settings.heightAccessor == null) {
        return 'translate(0, 0)'
      }
      const height = this.gene_height_excerpt(scale_height, d)
      const y = (this.settings.svgHeight - height) / 2
      return `translate(0, ${y})`
    },
    has_direction_arrow(d) {
      return this.show_direction_triangles && (d.data.strand === '+' || d.data.strand === '-')
    },
    direction_triangle_path(scale, scale_height, d) {
      // arrow glyph spanning the gene's real d_start..d_end footprint: a blunt box for the tail
      // (gene_arrow_box_ratio of the width) and a triangle for the rest, tip in the strand direction
      const height = this.gene_height_excerpt(scale_height, d)
      const x0 = scale(this.d_start(d))
      const x1 = scale(this.d_end(d))
      const boxWidth = (x1 - x0) * this.gene_arrow_box_ratio
      if (d.data.strand === '-') {
        const xb = x1 - boxWidth
        return `M${x1},0 L${x1},${height} L${xb},${height} L${x0},${height / 2} L${xb},0 Z`
      }
      const xb = x0 + boxWidth
      return `M${x0},0 L${x0},${height} L${xb},${height} L${x1},${height / 2} L${xb},0 Z`
    },
    set_height_gene_excerpt_scale() {

      if (this.settings.heightAccessor === null) {
        return this.settings.svgHeight;
      }

      else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor]
        return d3.scaleLinear().clamp(true).domain([extent.min, extent.max]).range([0, this.settings.svgHeight]);
      }

    },

    // UI INTERACTION
    showMenu(event, d) {

      this.menuPosition = {x: event.pageX, y: event.pageY};

      this.menuContent = []

      // invalidates any still-pending OMA fetches from a previously opened tooltip, so a slow
      // response can't splice its content into a menu that has since moved on to another gene
      const requestId = ++this.menuRequestId

      this.menuContent.push({class: 'title', content: d.id , click:null, style: "font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em;text-align: center;"})

      const level_api = this.settings.level ? '?level=' + this.settings.level : ''

      // fetch and display OMA datum - async, with a spinner placeholder, so the tooltip itself
      // opens immediately instead of blocking on the network round-trip
      if (this.settings.oma) {

        const infoPlaceholder = {type: 'text', content: this.oma_loading_html('Loading protein info…'), click:null, style: null}
        this.menuContent.push(infoPlaceholder)

        const infoUrl = this.settings.type_chromosome === 'extant'
            ? `${this.settings.oma_api_url}/api/protein/${d.id}/`
            : `${this.settings.oma_api_url}/api/hog/${d.id}/${level_api}`

        this.fetch_oma_json(infoUrl).then(data => {
          if (requestId !== this.menuRequestId) return
          const idx = this.menuContent.indexOf(infoPlaceholder)
          if (idx === -1) return

          if (!data) {
            this.menuContent.splice(idx, 1)
            return
          }

          const items = this.settings.type_chromosome === 'extant'
              ? [
                {type: 'text', content: '<b>External ID:</b> ' + data.canonicalid, click:null, style: null},
                {type: 'text', content: '<b>Description:</b> ' + data.description, click:null, style: null},{type: 'text', content: '<b>Sequence length:</b> ' + data.sequence_length, click:null, style: null},
                {type: 'text', content: '<b>Protein length:</b> ' + data.sequence_length, click:null, style: null},
              ]
              : [
                {type: 'text', content: '<b>Description:</b> ' + data[0].description, click:null, style: null},
              ]

          this.menuContent.splice(idx, 1, ...items)
        })
      }

      // Display additional data metrics (incl. start/end position), sorted alphabetically for
      // easier reading. Edge-derived metrics are shown in their own tooltip via showEdgeMenu.
      const { geneKeys } = this.collect_metric_keys()

      if (this.datum.type === 'extant') {
        this.menuContent.push({type: 'text', content: `<span><b>Start:</b> ${this.pretty_locus(d.start)}</span>`, click:null, style: null})
        this.menuContent.push({type: 'text', content: `<span><b>End:</b> ${this.pretty_locus(d.end)}</span>`, click:null, style: null})
      }

      Array.from(geneKeys).sort((a, b) => a.localeCompare(b)).forEach(key => {
        this.menuContent.push({type: 'text', content: `<span><b>${this.format_metric_label(key)}:</b> ${this.format_metric_value(d.data[key])}</span>`, click:null, style: null})
      })

      // add Action buttons - compact icon+label row (see action_button) rather than three
      // stacked full-width "Open ..." buttons, so they read at a glance and don't push the
      // GO annotations section further down
      if (this.settings.oma) {

        this.menuContent.push(this.action_button('bi-diagram-3', 'Synteny', () => this.callback_click_synteny(d.id)))
        this.menuContent.push(this.action_button('bi-info-circle', 'Details', () => this.callback_click_detail(d.id)))

        if (this.settings.type_chromosome === 'ancestral') {
          this.menuContent.push(this.action_button('bi-table', 'Members', () => this.callback_click_members(d.id)))
        }

      }

      // add GOA section - async, with its own spinner placeholder while it loads
      if (this.settings.oma) {

        const goPlaceholder = {type: 'text', content: this.oma_loading_html('Loading GO annotations…'), click:null, style: null}
        this.menuContent.push(goPlaceholder)

        const url = this.settings.type_chromosome === 'ancestral'
            ? `${this.settings.oma_api_url}/api/hog/${d.id}/gene_ontology/${level_api}`
            : `${this.settings.oma_api_url}/api/protein/${d.id}/gene_ontology/`

        this.fetch_oma_json(url).then(data_annotation => {
          if (requestId !== this.menuRequestId) return
          const idx = this.menuContent.indexOf(goPlaceholder)
          if (idx === -1) return

          if (!data_annotation) {
            this.menuContent.splice(idx, 1)
            return
          }

          const items = []
          items.push({type: 'text', content: ` <hr style="margin-top: 0.1em; margin-bottom: 0.2em"> <b>GO annotations</b>  <hr style="margin-top: 0.1em; margin-bottom: 0.2em">`, click:null, style: null})

          const goa = this.process_annotation(data_annotation)

          const add_annotation_by_aspect = (array_aspect, text) => {
            var sbio = Array.from(array_aspect).sort(function (a, b) {
              return parseFloat(b.score) - parseFloat(a.score);
            })
            items.push({type: 'text', content: '<span style="margin-top: 0.5em"><b> ' + text + ' </b>: </span>', click:null, style: null})

            for (var sbioKey in sbio) {
              let go = sbio[sbioKey]
              items.push({type: 'text', content: '<b> - ' + go.GO_term + '</b>: ' + go.name, click:null, style: null})
            }
          }

          add_annotation_by_aspect(goa.bio, 'Biological Process')
          add_annotation_by_aspect(goa.cell, 'Cellular Component')
          add_annotation_by_aspect(goa.mol, 'Molecular Function')

          this.menuContent.splice(idx, 1, ...items)
        })
      }


      this.menuVisible = true;



    },
    // fetch helper for OMA endpoints: resolves to the parsed JSON, or null on any failure
    // (network error, non-2xx status, bad JSON) so callers can drop their placeholder silently,
    // matching the old synchronous code's "only add content on HTTP 200" behavior
    fetch_oma_json(url) {
      return fetch(url)
          .then(response => response.ok ? response.json() : null)
          .catch(() => null)
    },
    oma_loading_html(label) {
      return `<span class="oma-loading"><span class="oma-spinner"></span>${label}</span>`
    },
    // builds a compact icon+label tooltip button that navigates out to the main OMA app -
    // the trailing box-arrow-up-right icon flags that as an external destination, unlike the
    // rest of the tooltip which is inline info. `inline: true` is read by the template to lay
    // consecutive action buttons out in a row instead of one per line.
    action_button(icon, label, onClick) {
      return {
        class: 'btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1',
        content: `<i class="bi ${icon}"></i><span>${label}</span><i class="bi bi-box-arrow-up-right" style="font-size: 0.7em;"></i>`,
        click: onClick,
        style: null,
        inline: true,
      }
    },
    // splits every key seen across the dataset's data_metrics into gene-level keys and
    // edge-level keys (the '_edge' suffix added by GenomeViewer's bind_links_to_nodes),
    // shared by showMenu (gene tooltip) and showEdgeMenu (edge tooltip)
    collect_metric_keys() {
      const geneKeys = new Set()
      const edgeKeys = new Set()

      const collectKeys = (metrics) => {
        if (!metrics) return
        for (const key of Object.keys(metrics)) {
          if (key.endsWith('_edge')) {
            edgeKeys.add(key)
          } else {
            geneKeys.add(key)
          }
        }
      }

      collectKeys(this.settings.data_metrics.categorical)
      collectKeys(this.settings.data_metrics.numerical)

      return { geneKeys, edgeKeys }
    },
    // data field names are raw dataset keys (e.g. 'completeness_score') - display them as
    // words rather than snake_case
    format_metric_label(key) {
      return key.replace(/_/g, ' ')
    },
    // raw numeric metrics can carry long floating-point noise (e.g. 0.8330000042915344) -
    // round to 3 decimal places for display; integers (e.g. nr_members) are left untouched
    format_metric_value(value) {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return value.toFixed(3)
      }
      return value
    },
    showEdgeMenu(event, leftGene, rightGene) {

      this.menuPosition = {x: event.pageX, y: event.pageY};

      this.menuContent = []

      // invalidates any still-pending OMA fetch from a previously opened gene tooltip
      this.menuRequestId++

      this.menuContent.push({class: 'title', content: `${leftGene.id} — ${rightGene.id}`, click:null, style: "font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em;text-align: center;"})

      const { edgeKeys } = this.collect_metric_keys()

      if (edgeKeys.size === 0) {
        this.menuContent.push({type: 'text', content: '<span>No edge data available</span>', click:null, style: null})
      } else {
        Array.from(edgeKeys).sort((a, b) => a.localeCompare(b)).forEach(key => {
          const label = this.format_metric_label(key.slice(0, -'_edge'.length))
          this.menuContent.push({type: 'text', content: `<span><b>${label}:</b> ${this.format_metric_value(leftGene.data[key])}</span>`, click:null, style: null})
        })
      }

      this.menuVisible = true;

    },
    get_selected_genes() {
      return this.datum.nodes.filter(d => this.isInSelectedRegion(d));
    },
    process_annotation(data_annotation){

      var ann_proc = {
        'bio': new Set(),
        'cell': new Set(),
        'mol': new Set()
      }

    for (const contentKey in data_annotation) {

        var go = data_annotation[contentKey]

        switch (go.aspect) {

          case "cellular_component":
            if (![...ann_proc.cell].some(item => item.GO_term === go.GO_term)) {
              ann_proc.cell.add(go);
            }
            break;
          case 'biological_process':
            if (![...ann_proc.bio].some(item => item.GO_term === go.GO_term)) {
              ann_proc.bio.add(go);
            }
            break;
          case 'molecular_function':
            if (![...ann_proc.mol].some(item => item.GO_term === go.GO_term)) {
              ann_proc.mol.add(go);
            }
            break;
          default:
            console.log(`${go.aspect} not recognise as annotation category.`);

        }

      }

    return ann_proc
    },
    hideMenu() {
      this.menuVisible = false;
      // invalidates any still-pending OMA fetch so it can't splice content into a closed menu
      this.menuRequestId++
    },
    handleClickOutside(event) {
      // clicks on the excerpt SVG are excluded too, not just the menu itself: they're what
      // switches the tooltip from one gene/edge to another, and should update it in place
      // rather than close it
      const menuEl = this.$refs.menuEl
      const svgExcerpt = this.$refs.svg_excerpt
      if (menuEl && menuEl.contains(event.target)) return
      if (svgExcerpt && svgExcerpt.contains(event.target)) return
      this.hideMenu()
    },
    toggleSvgDisplay() {
      const svgExcerpt = this.$refs.svg_excerpt;
      const svgMapper = this.$refs.svg_mapper;

      if (this.settings.hide) {
        svgExcerpt.style.display = 'none';
        svgMapper.style.display = 'none';
        return;
      } else {
        svgExcerpt.style.display = 'block';
        svgMapper.style.display = 'block';
      }
    },

    // UTILS
    pretty_locus(l) {
      return d3.format(",d")(Math.round(l))
    },
    isInSelectedRegion(d) {
      return this.datum.selectedRegions.some(([x0, x1]) => this.d_start(d) >= x0 && this.d_end(d) <= x1);
    },
    set_anchor_position(d) {

      // THIS function is used to set the anchor position of the text for mapper.
      // Must mirror render_mapper's scale_overview exactly (domain_min_current/domain_max_current,
      // not the cross-chromosome domain_max prop) - otherwise the pixel positions computed here
      // don't match where the labels actually land, and the overlap check below is meaningless.
      var [min, max] = this.get_min_max()
      var scale = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);
      var minPixel = scale(min);
      var maxPixel = scale(max);
      var edge_threshold = 50; // keeps a label from clipping off the left/right edge of the mapper

      // min is always right-anchored (grows leftward, away from the excerpt window) and max is
      // always left-anchored (grows rightward) - as the two ticks converge under heavy zoom they
      // diverge away from each other instead of overlapping, down to a pixel apart.
      if (d === min) {
        return minPixel < edge_threshold ? 'start' : 'end';
      }
      return (this.CurrentWidth - maxPixel) < edge_threshold ? 'end' : 'start';
    },
    get_min_max() {
      var min = this.datum.domain !== null ? this.datum.domain[0] : 0
      var max = this.datum.domain !== null ? this.datum.domain[1] : this.domain_max

      return [min, max]
    },
    get_x1_edge(scale, d, i) {
      return scale(this.d_start(d)) - (scale(this.d_start(d)) - scale(this.d_end(this.datum.nodes[i]))) / 2
    },
    getCurrentWidth() {
      return (this.parentWidth * (this.domain_max_current / this.domain_max))
    },

    // EVENTS
    emitEvent(eventType, payload = null) {
      this.$emit('chromosome-event', {eventType, payload});
    },


  },
  mounted() {
    this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth - (window.innerWidth * 0.04);
    this.CurrentWidth = this.getCurrentWidth()
    this.applyDefaultExcerptZoom()
    this.render_excerpt();
    this.render_mapper();
    this.render_overview();

  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  data() {
    return {
      CurrentWidth: null,
      parentWidth: null,
      margin_top_svg: 0,
      menuVisible: false,
      menuPosition: {x: 0, y: 0},
      menuContent: [],
      menuRequestId: 0,
      color_scheme: this.settings.color_scheme_list[this.settings.color_scheme],
      color_scheme_edge: this.settings.color_scheme_list[this.settings.color_scheme_edge],
      gene_arrow_box_ratio: 0.2,
    }
  },
  emits: ['chromosome-event'],
  }


</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.svg-element {
display: block;
}

#interface_chr_small_container {
  padding: 2vw;
  width: 100%;
}

#interface_chr_small_container_div {
  display: flex;
}

#chromosome_name {
  margin-right: 8px;
  text-align: left;
  font-weight: bold;
  color: rgb(99,99,102);
}

#chromosome_genes_desc {
  text-align: left;
  color: rgb(99,99,102);
}

.brush .selection {
  display: none !important;
}

.menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  z-index: 1000;
}

.close-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
}

/* :deep() is required here because this markup is injected via v-html (menuContent items),
   so it never receives the scoped data-v-* attribute plain scoped selectors rely on. */
:deep(.oma-loading) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(99,99,102);
  font-style: italic;
}

:deep(.oma-spinner) {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 2px solid #ccc;
  border-top-color: #666;
  border-radius: 50%;
  animation: oma-spin 0.8s linear infinite;
}

@keyframes oma-spin {
  to { transform: rotate(360deg); }
}



</style>
