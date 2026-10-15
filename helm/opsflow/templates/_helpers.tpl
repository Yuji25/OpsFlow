{{- define "opsflow.fullname" -}}
{{- .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{- define "opsflow.selectorLabels" -}}
app.kubernetes.io/name: opsflow
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}

{{- define "opsflow.labels" -}}
{{ include "opsflow.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}
