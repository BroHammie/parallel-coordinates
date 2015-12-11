d3.rebind(pc, axis, "ticks", "orient", "tickValues", "tickSubdivide", "tickSize", "tickPadding", "tickFormat");

function flipAxisAndUpdatePCP(dimension) {
  var g = pc.svg.selectAll(".dimension");

  pc.flip(dimension);

  d3.select(this.parentElement)
    .transition()
      .duration(1100)
      .call(axis.scale(yscale[dimension]));

  pc.render();
}

function rotateLabels() {
  var delta = d3.event.deltaY;
  delta = delta < 0 ? -18 : delta;
  delta = delta > 0 ? 5 : delta;

  __.dimensionTitleRotation += delta;
  pc.svg.selectAll("text.label")
    .attr("transform", "translate(0,-18) rotate(" + __.dimensionTitleRotation + ")");
  d3.event.preventDefault();
}

function dimensionLabels(d) {
  return d in __.dimensionTitles ? __.dimensionTitles[d] : d;  // dimension display names
}

function dimensionMax(d) {
    return d in yscale ? (yscale[d].domain()[1]).toFixed(2) : d;  // dimension display names
}

function dimensionMin(d) {
    return d in yscale ? (yscale[d].domain()[0]).toFixed(2) : d;  // dimension display names
}

function dimensionValListener(e) {
    var p = this.parentNode;

    var xy = this.getBBox();
    var p_xy = p.getBBox();

    xy.x = p_xy.x;
    xy.y = p_xy.y;

    var el = d3.select(this);
    var p_el = d3.select(p);

    var form = p_el.append("foreignObject");

    var input = form
        .attr({
            "x": xy.x,
            "y": d3.transform(el.attr('transform')).translate[1]-25,
            "height": 25
        })
        .append("xhtml:form")
        .append("input")
        .attr({
            "value": function () {
                // nasty spot to place this call, but here we are sure that the <input> tag is available
                // and is handily pointed at by 'this':
                this.focus();
                return parseFloat(el.text());
            },
            "class": "axis-text",
            "size": 8
        })
        .on("blur", function () {
            updateMaxMinExtents(el, p_el, input.node().value);
        })
        .on("keypress", function () {
            // IE fix
            if (!d3.event)
                d3.event = window.event;

            var e = d3.event;
            if (e.keyCode == 13) {
                if (typeof(e.cancelBubble) !== 'undefined') // IE
                    e.cancelBubble = true;
                if (e.stopPropagation)
                    e.stopPropagation();
                e.preventDefault();

                updateMaxMinExtents(el, p_el, input.node().value);
            }
        });
}

function updateMaxMinExtents(element, parent, val) {
    val = parseFloat(val);
    element.text(val);

    parent.select("foreignObject").remove();
    var oldExtents = pc.brushExtents();
    var newAxisExtent = element.attr('class') === 'axis-min' ? [val, parseFloat(parent.select('.axis-max').text())] : [parseFloat(parent.select('.axis-min').text()), val];

    oldExtents[element[0][0].__data__] = newAxisExtent;
    pc.brushExtents(oldExtents);
}

function addMaxMinText(g) {
    g.append("svg:text")
        .attr({
            "contentEditable" : "true",
            "text-anchor": "middle",
            "y": 0,
            "transform": "translate(0,-3)",
            "x": 0,
            "class": "axis-max"
        })
        .text(dimensionMax)
        .on("click", dimensionValListener);

    g.append("svg:text")
        .attr({
            "contentEditable" : "true",
            "text-anchor": "middle",
            "y": 0,
            "transform": "translate(0,"+(h()+20)+")",
            "x": 0,
            "class": "axis-min"
        })
        .text(dimensionMin)
        .on("click", dimensionValListener);
}

pc.createAxes = function() {
  if (g) pc.removeAxes();

  // Add a group element for each dimension.
  g = pc.svg.selectAll(".dimension")
      .data(__.dimensions, function(d) { return d; })
    .enter().append("svg:g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; });

  // Add an axis and title.
  g.append("svg:g")
      .attr("class", "axis")
      .attr("transform", "translate(0,0)")
      .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); })
    .append("svg:text")
      .attr({
        "text-anchor": "middle",
        "y": 0,
        "transform": "translate(0,-18) rotate(" + __.dimensionTitleRotation + ")",
        "x": 0,
        "class": "label"
      })
      .text(dimensionLabels)
      .on("dblclick", flipAxisAndUpdatePCP)
      .on("wheel", rotateLabels);
  addMaxMinText(g);

  flags.axes= true;
  return this;
};

pc.removeAxes = function() {
  g.remove();
  return this;
};

pc.updateAxes = function() {
  var g_data = pc.svg.selectAll(".dimension").data(__.dimensions);

    // Enter, save dimension to add multiple svg:text
    var dimension = g_data.enter().append("svg:g")
        .attr("class", "dimension")
        .attr("transform", function(p) { return "translate(" + position(p) + ")"; })
        .style("opacity", 0)
        .append("svg:g")
        .attr("class", "axis")
        .attr("transform", "translate(0,0)");

    dimension.each(function(d) { d3.select(this).call(axis.scale(yscale[d])); })
        .append("svg:text")
        .attr({
            "text-anchor": "middle",
            "y": 0,
            "transform": "translate(0,-18) rotate(" + __.dimensionTitleRotation + ")",
            "x": 0,
            "class": "label"
        })
        .text(dimensionLabels)
        .on("dblclick", flipAxisAndUpdatePCP)
        .on("wheel", rotateLabels);

    addMaxMinText(dimension);

  // Update
  g_data.attr("opacity", 0);
  g_data.select(".axis")
    .transition()
      .duration(1100)
      .each(function(d) {
        d3.select(this).call(axis.scale(yscale[d]));
      });
  g_data.select(".label")
    .transition()
      .duration(1100)
      .text(dimensionLabels)
      .attr("transform", "translate(0,-18) rotate(" + __.dimensionTitleRotation + ")");

  // Exit
  g_data.exit().remove();

  g = pc.svg.selectAll(".dimension");
  g.transition().duration(1100)
    .attr("transform", function(p) { return "translate(" + position(p) + ")"; })
    .style("opacity", 1);

  pc.svg.selectAll(".axis")
    .transition()
      .duration(1100)
      .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); });

  if (flags.brushable) pc.brushable();
  if (flags.reorderable) pc.reorderable();
  if (pc.brushMode() !== "None") {
    var mode = pc.brushMode();
    pc.brushMode("None");
    pc.brushMode(mode);
  }
  return this;
};

// Jason Davies, http://bl.ocks.org/1341281
pc.reorderable = function() {
  if (!g) pc.createAxes();

  g.style("cursor", "move")
    .call(d3.behavior.drag()
      .on("dragstart", function(d) {
        dragging[d] = this.__origin__ = xscale(d);
      })
      .on("drag", function(d) {
        dragging[d] = Math.min(w(), Math.max(0, this.__origin__ += d3.event.dx));
        __.dimensions.sort(function(a, b) { return position(a) - position(b); });
        xscale.domain(__.dimensions);
        pc.render();
        g.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
      })
      .on("dragend", function(d) {
        // Let's see if the order has changed and send out an event if so.
        var i = 0,
            j = __.dimensions.indexOf(d),
            elem = this,
            parent = this.parentElement;

        while((elem = elem.previousElementSibling) != null) ++i;
        if (i !== j) {
          events.axesreorder.call(pc, __.dimensions);
          // We now also want to reorder the actual dom elements that represent
          // the axes. That is, the g.dimension elements. If we don't do this,
          // we get a weird and confusing transition when updateAxes is called.
          // This is due to the fact that, initially the nth g.dimension element
          // represents the nth axis. However, after a manual reordering,
          // without reordering the dom elements, the nth dom elements no longer
          // necessarily represents the nth axis.
          //
          // i is the original index of the dom element
          // j is the new index of the dom element
          if (i > j) { // Element moved left
            parent.insertBefore(this, parent.children[j - 1]);
          } else {     // Element moved right
            if ((j + 1) < parent.children.length) {
              parent.insertBefore(this, parent.children[j + 1]);
            } else {
              parent.appendChild(this);
            }
          }
        }

        delete this.__origin__;
        delete dragging[d];
        d3.select(this).transition().attr("transform", "translate(" + xscale(d) + ")");
        pc.render();
      }));
  flags.reorderable = true;
  return this;
};

// Reorder dimensions, such that the highest value (visually) is on the left and
// the lowest on the right. Visual values are determined by the data values in
// the given row.
pc.reorder = function(rowdata) {
  var dims = __.dimensions.slice(0);
  __.dimensions.sort(function(a, b) {
    var pixelDifference = yscale[a](rowdata[a]) - yscale[b](rowdata[b]);

    // Array.sort is not necessarily stable, this means that if pixelDifference is zero
    // the ordering of dimensions might change unexpectedly. This is solved by sorting on
    // variable name in that case.
    if (pixelDifference === 0) {
      return a.localeCompare(b);
    } // else
    return pixelDifference;
  });

  // NOTE: this is relatively cheap given that:
  // number of dimensions < number of data items
  // Thus we check equality of order to prevent rerendering when this is the case.
  var reordered = false;
  dims.some(function(val, index) {
    reordered = val !== __.dimensions[index];
    return reordered;
  });

  if (reordered) {
    xscale.domain(__.dimensions);
    var highlighted = __.highlighted.slice(0);
    pc.unhighlight();

    g.transition()
      .duration(1500)
      .attr("transform", function(d) {
        return "translate(" + xscale(d) + ")";
      });
    pc.render();

    // pc.highlight() does not check whether highlighted is length zero, so we do that here.
    if (highlighted.length !== 0) {
      pc.highlight(highlighted);
    }
  }
}

// pairs of adjacent dimensions
pc.adjacent_pairs = function(arr) {
  var ret = [];
  for (var i = 0; i < arr.length-1; i++) {
    ret.push([arr[i],arr[i+1]]);
  };
  return ret;
};
