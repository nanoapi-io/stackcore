import {
  type auditManifestTypes,
  dependencyManifestTypes,
} from "@stackcore/shared";
import { Alert, AlertDescription } from "../../../shadcn/Alert.tsx";

export default function Metrics(props: {
  dependencyManifest:
    | dependencyManifestTypes.DependencyManifest[string]
    | dependencyManifestTypes.DependencyManifest[string]["symbols"][string]
    | undefined;
  auditManifest:
    | auditManifestTypes.AuditManifest[string]
    | auditManifestTypes.AuditManifest[string]["symbols"][string]
    | undefined;
}) {
  function metricToHumanString(metric: string) {
    switch (metric) {
      case dependencyManifestTypes.metricLinesCount:
        return "Lines";
      case dependencyManifestTypes.metricCodeLineCount:
        return "Code Lines";
      case dependencyManifestTypes.metricCharacterCount:
        return "Characters";
      case dependencyManifestTypes.metricCodeCharacterCount:
        return "Code Characters";
      case dependencyManifestTypes.metricDependencyCount:
        return "Dependencies";
      case dependencyManifestTypes.metricDependentCount:
        return "Dependents";
      case dependencyManifestTypes.metricCyclomaticComplexity:
        return "Cyclomatic Complexity";
      default:
        return metric;
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      {Object.entries(props.dependencyManifest?.metrics || {}).map((
        [key, value],
      ) => (
        <div key={key} className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {metricToHumanString(key)}
            </div>
            <div>
              {value}
            </div>
          </div>
          {(props.auditManifest?.alerts || {})?.[key] && (
            <Alert variant="destructive">
              <AlertDescription>
                {props.auditManifest?.alerts?.[key]?.message?.long}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ))}
    </div>
  );
}
