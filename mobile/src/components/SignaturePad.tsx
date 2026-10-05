import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

type Point = { x: number; y: number };
type Stroke = Point[];

function parseStrokes(value: string): Stroke[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((stroke): stroke is Stroke =>
      Array.isArray(stroke) &&
      stroke.every((point) =>
        point &&
        typeof point === "object" &&
        Number.isFinite((point as Point).x) &&
        Number.isFinite((point as Point).y)
      )
    );
  } catch {
    return [];
  }
}

export function SignaturePad({
  value,
  onChange,
  readOnly = false
}: {
  value: string;
  onChange?: (signature: string) => void;
  readOnly?: boolean;
}) {
  const strokes = useMemo(() => parseStrokes(value), [value]);
  const strokesRef = useRef(strokes);
  const onChangeRef = useRef(onChange);
  const [, setRevision] = useState(0);

  useEffect(() => {
    strokesRef.current = strokes;
    onChangeRef.current = onChange;
  }, [strokes, onChange, value]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !readOnly,
    onMoveShouldSetPanResponder: () => !readOnly,
    onMoveShouldSetPanResponderCapture: () => !readOnly,
    onPanResponderGrant: (event) => {
      const firstPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const next = [...strokesRef.current, [firstPoint]];
      strokesRef.current = next;
      setRevision((revision) => revision + 1);
      onChangeRef.current?.(JSON.stringify(next));
    },
    onPanResponderMove: (event) => {
      const lastStroke = strokesRef.current[strokesRef.current.length - 1];
      if (!lastStroke) return;
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const next = [
        ...strokesRef.current.slice(0, -1),
        [...lastStroke, point]
      ];
      strokesRef.current = next;
      setRevision((revision) => revision + 1);
      onChangeRef.current?.(JSON.stringify(next));
    }
  })).current;

  function clear() {
    strokesRef.current = [];
    setRevision((revision) => revision + 1);
    onChangeRef.current?.("");
  }

  const hasSignature = strokes.some((stroke) => stroke.length > 1);

  return (
    <View style={styles.container}>
      {!readOnly && (
        <View style={styles.heading}>
          <Text style={styles.label}>Sign inside the box *</Text>
          <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel="Clear signature">
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>
      )}
      <View
        style={[styles.canvas, readOnly && styles.readOnlyCanvas]}
        {...(!readOnly ? panResponder.panHandlers : {})}
        accessibilityLabel="Signature drawing area"
      >
        {!hasSignature && !readOnly && (
          <Text pointerEvents="none" style={styles.placeholder}>Draw your signature here</Text>
        )}
        {strokes.map((stroke, strokeIndex) => stroke.map((point, pointIndex) => {
          if (pointIndex === 0) {
            return (
              <View
                key={`${strokeIndex}-${pointIndex}`}
                style={[styles.dot, { left: point.x - 2, top: point.y - 2 }]}
              />
            );
          }
          const previous = stroke[pointIndex - 1];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={`${strokeIndex}-${pointIndex}`}
              style={[
                styles.line,
                {
                  left: (point.x + previous.x - length) / 2,
                  top: (point.y + previous.y - 3) / 2,
                  width: length,
                  transform: [{ rotate: `${angle}rad` }]
                }
              ]}
            />
          );
        }))}
        <View pointerEvents="none" style={styles.baseline} />
      </View>
      {readOnly && !hasSignature && <Text style={styles.empty}>No signature provided.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  label: { color: "#173C5A", fontWeight: "700" },
  clear: { color: "#0D568B", fontWeight: "700", padding: 4 },
  canvas: {
    height: 160,
    borderWidth: 1,
    borderColor: "#9DB4C2",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "relative"
  },
  readOnlyCanvas: { height: 130, borderColor: "#D5E1E8" },
  placeholder: { position: "absolute", alignSelf: "center", top: 58, color: "#9AAAB3" },
  dot: { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: "#153E60" },
  line: { position: "absolute", height: 3, borderRadius: 2, backgroundColor: "#153E60" },
  baseline: { position: "absolute", left: 12, right: 12, bottom: 26, borderBottomWidth: 1, borderColor: "#E1E7EB" },
  empty: { color: "#7A858B", fontSize: 13, marginTop: 5 }
});
