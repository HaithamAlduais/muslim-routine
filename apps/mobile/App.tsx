import * as React from "react"
import Constants from "expo-constants"
import * as Linking from "expo-linking"
import { StatusBar } from "expo-status-bar"
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { WebView } from "react-native-webview"

const loadingTimeoutMs = 15000

const copy = {
  title: "\u0631\u0648\u062A\u064A\u0646\u064A",
  refresh: "\u062A\u062D\u062F\u064A\u062B",
  errorTitle:
    "\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642",
  errorHint:
    "\u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0633\u062A\u062E\u062F\u0645 \u0647\u0627\u062A\u0641\u0627 \u062D\u0642\u064A\u0642\u064A\u0627\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0631\u0627\u0628\u0637 HTTPS \u0645\u0646\u0634\u0648\u0631\u0627 \u0623\u0648 \u0639\u0646\u0648\u0627\u0646 IP \u0644\u062C\u0647\u0627\u0632\u0643 \u0639\u0644\u0649 \u0646\u0641\u0633 \u0634\u0628\u0643\u0629 Wi-Fi.",
  loadingTimeout:
    "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644.",
  networkError:
    "\u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644.",
  retry:
    "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629",
}

export default function App() {
  const webViewRef = React.useRef<WebView>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = React.useState(0)
  const appUrl = getRoutineAppUrl()
  const hasError = loadError !== null

  React.useEffect(() => {
    if (!isLoading || hasError) {
      return undefined
    }

    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setLoadError(copy.loadingTimeout)
    }, loadingTimeoutMs)

    return () => clearTimeout(timeoutId)
  }, [hasError, isLoading, loadAttempt])

  function retryLoad() {
    setLoadError(null)
    setIsLoading(true)
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text selectable style={styles.eyebrow}>
            Muslim Routine
          </Text>
          <Text selectable style={styles.title}>
            {copy.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={retryLoad}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy.refresh}</Text>
        </Pressable>
      </View>

      <View style={styles.webFrame}>
        {hasError ? (
          <View style={styles.message}>
            <Text selectable style={styles.messageTitle}>
              {copy.errorTitle}
            </Text>
            <Text selectable style={styles.messageBody}>
              {formatErrorMessage(appUrl, loadError)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={retryLoad}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{copy.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={loadAttempt}
            ref={webViewRef}
            source={{ uri: appUrl }}
            applicationNameForUserAgent="MuslimRoutineAndroid"
            allowsBackForwardNavigationGestures
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["http://*", "https://*"]}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(event) => {
              setIsLoading(false)
              setLoadError(
                event.nativeEvent.description || copy.networkError,
              )
            }}
            onHttpError={(event) => {
              if (event.nativeEvent.statusCode >= 400) {
                setIsLoading(false)
                setLoadError(
                  `${copy.networkError} HTTP ${event.nativeEvent.statusCode}`,
                )
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              const isRoutineUrl = request.url.startsWith(appUrl)

              if (!isRoutineUrl && request.navigationType === "click") {
                Linking.openURL(request.url)
                return false
              }

              return true
            }}
            style={styles.webView}
          />
        )}

        {isLoading && !hasError && (
          <View pointerEvents="none" style={styles.loading}>
            <ActivityIndicator color="#34d399" size="large" />
          </View>
        )}
      </View>
    </View>
  )
}

function getRoutineAppUrl() {
  const envUrl = process.env.EXPO_PUBLIC_ROUTINE_APP_URL
  const configuredUrl = Constants.expoConfig?.extra?.routineAppUrl

  return typeof envUrl === "string" && envUrl.length > 0
    ? envUrl
    : typeof configuredUrl === "string" && configuredUrl.length > 0
      ? configuredUrl
      : "http://10.0.2.2:3000"
}

function formatErrorMessage(appUrl: string, reason: string | null) {
  return `${reason || copy.networkError}\n${appUrl}\n${copy.errorHint}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061017",
    direction: I18nManager.isRTL ? "rtl" : "ltr",
    paddingTop: Constants.statusBarHeight,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(148, 163, 184, 0.22)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyebrow: {
    color: "#8bd8c2",
    fontSize: 12,
    textAlign: "right",
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
  },
  button: {
    backgroundColor: "rgba(52, 211, 153, 0.16)",
    borderColor: "rgba(52, 211, 153, 0.45)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#d1fae5",
    fontSize: 13,
    fontWeight: "600",
  },
  webFrame: {
    flex: 1,
    overflow: "hidden",
  },
  webView: {
    backgroundColor: "#061017",
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: "rgba(6, 16, 23, 0.32)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  message: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  messageTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  messageBody: {
    color: "#b6c7d2",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#34d399",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#042014",
    fontSize: 14,
    fontWeight: "700",
  },
})
