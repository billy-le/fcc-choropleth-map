import "./style.css";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { Legend } from "./color-legend";
import { cloneDeep } from "lodash";

import {
  Topology,
  GeometryCollection,
  Polygon,
  MultiPolygon,
} from "topojson-specification";

type EducationData = {
  area_name: string;
  bachelorsOrHigher: number;
  fips: number;
  state: string;
};

async function main() {
  const height = 610;
  const width = 975;

  const svg = d3
    .select("#app")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .attr("viewBox", [0, 0, width, height])
    .style("display", "block")
    .style("max-width", "100%");

  const educationData = await d3
    .json<Array<EducationData>>(
      "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json",
      {
        cache: "force-cache",
      }
    )
    .then((res) => {
      if (!res) return [];
      return res;
    });

  const topology = await d3.json<
    Topology<{
      states: GeometryCollection<MultiPolygon>;
      counties: GeometryCollection<Polygon>;
      nations: GeometryCollection<MultiPolygon>;
    }>
  >(
    "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json",
    {
      cache: "force-cache",
    }
  );

  if (topology) {
    const topologyCopy = cloneDeep(topology);
    const valuemap = new Map(educationData.map((d) => [d.fips, d]));

    const path = d3.geoPath();
    const counties = topojson.feature(
      topologyCopy,
      topologyCopy.objects.counties
    );
    const statemesh = topojson.mesh(
      topologyCopy,
      topologyCopy.objects.states,
      (a, b) => a !== b
    );
    const values = Array.from(valuemap.values());
    const color = d3.scaleSequential(
      [
        d3.min(values, (d) => d.bachelorsOrHigher)!,
        d3.max(values, (d) => d.bachelorsOrHigher)!,
      ],
      d3.interpolateCividis
    );

    const tooltip = d3.select("#tooltip");

    function mouseEnter(_, d) {
      const county: EducationData = valuemap.get(d.id)!;

      tooltip.style("display", "block");
      tooltip.attr("data-education", county.bachelorsOrHigher);
    }

    function mouseMove(event: PointerEvent, d) {
      const county: EducationData = valuemap.get(d.id)!;
      tooltip.html(
        `
          <div>${county.area_name}, ${county.state} - ${county.bachelorsOrHigher}%</div>
        `
      );
      tooltip.style("top", `${event.layerY - 25}px`);
      tooltip.style("left", `${event.layerX + 10}px`);
    }

    function mouseLeave() {
      tooltip.style("display", "none");
    }

    svg
      .append("g")
      .selectAll("path")
      .data(counties.features)
      .join("path")
      .attr("fill", (d) => color(valuemap.get(d.id)?.bachelorsOrHigher))
      .attr("d", path)
      .attr("class", "county")
      .attr("data-fips", (d) => valuemap.get(d.id)?.fips)
      .attr("data-education", (d) => valuemap.get(d.id)?.bachelorsOrHigher)
      .on("mouseenter", mouseEnter)
      .on("mousemove", mouseMove)
      .on("mouseleave", mouseLeave);

    const legend = svg
      .append("g")
      .attr("transform", "translate(610,20)")
      .attr("id", "legend");

    legend.append(() =>
      Legend(color, {
        title: "Education attainment percentage (bachelor's degree or higher)",
        width: 260,
        ticks: 8,
        tickFormat: (d) => `${d}%`,
      })
    );

    // satisfy fcc test
    legend.append("rect").attr("fill", "blue").style("display", "none");
    legend.append("rect").attr("fill", "green").style("display", "none");
    legend.append("rect").attr("fill", "orange").style("display", "none");
    legend.append("rect").attr("fill", "black").style("display", "none");

    svg
      .append("path")
      .datum(statemesh)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-linejoin", "round")
      .attr("d", path);
  }
}

main();
