const G6: typeof import('@antv/g6') = process.browser ? require('@antv/g6') : null

import { PlanGraph } from '@app/components'
import { Entities } from '@app/data'

const COLOR_DARK_GREY = '#6c757d'
const COLOR_GREEN = '#5eb95e'
const COLOR_RED = '#dd514c'
const COLOR_YELLOW = '#fad232'
const COLOR_WHITE = '#ffffff'

const LABEL_FONT_SIZE = 14
export const LABEL_CONTAINER_WIDTH = 120
const LABEL_MAX_WIDTH = 100
const LABEL_PADDING = LABEL_CONTAINER_WIDTH - LABEL_MAX_WIDTH

export const GraphData = {
  fromTerraformPlanResourceChange(
    changes: Entities.TerraformPlanResourceChange[],
  ): PlanGraph.Entities.GraphData {
    const intermediateGraph = IntermediateGraph.fromTerraformPlanResourceChange(changes)
    const graphChildren = IntermediateGraph.toGraphData(intermediateGraph)

    return graphChildren
  },
}

export const IntermediateGraph = {
  fromTerraformPlanResourceChange(
    changes: Entities.TerraformPlanResourceChange[],
  ): PlanGraph.Entities.IntermediateGraph {
    const graph: PlanGraph.Entities.IntermediateGraph = {
      id: 'root',
      label: 'root',
      children: {},
    }

    for (const resource of changes) {
      if (
        Entities.Utils.TerraformPlanResourceChangeChange.getActionAlias(resource.change) ===
        Entities.TerraformPlanResourceChangeChangeActionAlias.Noop
      ) {
        continue
      }

      const addrComps = resource.address.split('.')

      let cur = graph
      for (let i = 0; i < addrComps.length; i++) {
        const addr = addrComps[i]

        if (!cur.children[addr]) {
          const id = cur.id + '.' + addr

          cur.children[addr] = {
            id,
            label: addr,
            children: {},
          }
        }

        cur = cur.children[addr]
      }

      cur.resource = resource
    }

    return graph
  },

  toGraphData(
    intermediateGraph: PlanGraph.Entities.IntermediateGraph,
  ): PlanGraph.Entities.GraphData {
    const [label, labelWidth] = trimStr(intermediateGraph.label, LABEL_FONT_SIZE, LABEL_MAX_WIDTH)

    const graphData: PlanGraph.Entities.GraphData = {
      id: intermediateGraph.id,
      label,
      children: [],
      labelCfg: {
        style: {
          fill: COLOR_WHITE,
          fontSize: LABEL_FONT_SIZE,
        },
      },
      style: {
        width: labelWidth + LABEL_PADDING,
        fill: COLOR_DARK_GREY,
        stroke: COLOR_DARK_GREY,
        radius: 4,
      },
      resource: intermediateGraph.resource,
    }

    if (!graphData.style) {
      return graphData
    }

    if (graphData.resource) {
      const actionAlias = Entities.Utils.TerraformPlanResourceChangeChange.getActionAlias(
        graphData.resource.change,
      )

      switch (actionAlias) {
        case Entities.TerraformPlanResourceChangeChangeActionAlias.CreateDelete: {
          graphData.style.fill = COLOR_YELLOW
          graphData.style.stroke = COLOR_YELLOW
          break
        }

        case Entities.TerraformPlanResourceChangeChangeActionAlias.Create: {
          graphData.style.fill = COLOR_GREEN
          graphData.style.stroke = COLOR_GREEN
          break
        }

        case Entities.TerraformPlanResourceChangeChangeActionAlias.Update: {
          graphData.style.fill = COLOR_YELLOW
          graphData.style.stroke = COLOR_YELLOW
          break
        }

        case Entities.TerraformPlanResourceChangeChangeActionAlias.DeleteCreate: {
          graphData.style.fill = COLOR_YELLOW
          graphData.style.stroke = COLOR_YELLOW
          break
        }

        case Entities.TerraformPlanResourceChangeChangeActionAlias.Delete: {
          graphData.style.fill = COLOR_RED
          graphData.style.stroke = COLOR_RED
          break
        }
      }
    }

    for (const child of Object.values(intermediateGraph.children)) {
      graphData.children.push(IntermediateGraph.toGraphData(child))
    }

    return graphData
  },
}

/**
 * trimStr calculates how many chars could fit in given a fixed max width
 */
const trimStr = (inputStr: string, fontSize: number, maxWidth: number): [string, number] => {
  let width = 0

  const pattern = new RegExp('[\u4E00-\u9FA5]+')

  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i]

    let charWidth = 0
    if (pattern.test(char)) {
      charWidth += fontSize
    } else {
      charWidth += G6.Util.getLetterWidth(char, fontSize)
    }

    if (width + charWidth > maxWidth) {
      return [inputStr.slice(0, i) + '...', width]
    }

    width += charWidth
  }

  return [inputStr, width]
}
