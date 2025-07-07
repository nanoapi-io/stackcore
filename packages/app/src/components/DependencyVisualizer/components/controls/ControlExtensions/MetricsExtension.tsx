import { dependencyManifestTypes } from "@stackcore/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../shadcn/Tooltip.tsx";
import { Button } from "../../../../shadcn/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../shadcn/Dropdownmenu.tsx";

// Extension for the controls in the project view
export default function MetricsExtension(props: {
  busy: boolean;
  metricState: {
    metric: dependencyManifestTypes.Metric | undefined;
    setMetric: (metric: dependencyManifestTypes.Metric | undefined) => void;
  };
}) {
  const metric = props.metricState.metric;

  function getMetricLabel(metric: dependencyManifestTypes.Metric | undefined) {
    if (metric === dependencyManifestTypes.metricLinesCount) {
      return "Lines";
    }
    if (metric === dependencyManifestTypes.metricCodeLineCount) {
      return "Code Lines";
    }
    if (metric === dependencyManifestTypes.metricCharacterCount) {
      return "Chars";
    }
    if (metric === dependencyManifestTypes.metricCodeCharacterCount) {
      return "Code Chars";
    }
    if (metric === dependencyManifestTypes.metricDependencyCount) {
      return "Dependencies";
    }
    if (metric === dependencyManifestTypes.metricDependentCount) {
      return "Dependents";
    }
    if (metric === dependencyManifestTypes.metricCyclomaticComplexity) {
      return "Complexity";
    } else {
      return "None";
    }
  }

  return (
    <Tooltip delayDuration={500}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              disabled={props.busy}
            >
              {getMetricLabel(metric)}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {([
            { metric: undefined, label: "No Metric" },
            {
              metric: dependencyManifestTypes.metricLinesCount,
              label: "Lines",
            },
            {
              metric: dependencyManifestTypes.metricCodeLineCount,
              label: "Code Lines",
            },
            {
              metric: dependencyManifestTypes.metricCharacterCount,
              label: "Total Characters",
            },
            {
              metric: dependencyManifestTypes.metricCodeCharacterCount,
              label: "Code Characters",
            },
            {
              metric: dependencyManifestTypes.metricDependencyCount,
              label: "Dependencies",
            },
            {
              metric: dependencyManifestTypes.metricDependentCount,
              label: "Dependents",
            },
            {
              metric: dependencyManifestTypes.metricCyclomaticComplexity,
              label: "Complexity",
            },
          ] as {
            metric: dependencyManifestTypes.Metric | undefined;
            label: string;
          }[]).map((val) => (
            <DropdownMenuItem
              key={val.label}
              onClick={() => props.metricState?.setMetric?.(val.metric)}
            >
              {val.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>
        Select a metric to display on the graph
      </TooltipContent>
    </Tooltip>
  );
}
