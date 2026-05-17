"use client";

import type { BodyRegion, Language } from "@/lib/types";
import { getBodySubregionOptions } from "@/lib/body-location-taxonomy";
import { regionLabels } from "@/lib/i18n";
import HumanBody3D from "./HumanBody3D";

export const bodyRegions: BodyRegion[] = [
  "head",
  "chest",
  "abdomen",
  "back",
  "leftArm",
  "rightArm",
  "leftHand",
  "rightHand",
  "leftLeg",
  "rightLeg",
  "leftFoot",
  "rightFoot",
];

type BodyInteractionModelProps = {
  language: Language;
  highlightedRegion?: BodyRegion | null;
  focusedRegion?: BodyRegion | null;
  selectedSubregion?: string | null;
  onSelect: (region: BodyRegion) => void;
  onSelectSubregion?: (region: BodyRegion, subregion: string) => void;
};

type BodyRegionButtonsProps = {
  language: Language;
  highlightedRegion?: BodyRegion | null;
  selectedRegions: BodyRegion[];
  onSelect: (region: BodyRegion) => void;
};

export function BodyInteractionModel({
  language,
  highlightedRegion,
  focusedRegion,
  selectedSubregion,
  onSelect,
  onSelectSubregion,
}: BodyInteractionModelProps) {
  const highlightedAtriumRegion = highlightedRegion ? bodyRegionToAtriumRegion(highlightedRegion) : null;
  const focusedAtriumRegion = focusedRegion ? bodyRegionToAtriumRegion(focusedRegion) : null;
  const subregionLabels: Record<string, string> = focusedRegion
    ? Object.fromEntries(getBodySubregionOptions(focusedRegion, language).map((option) => [option.id, option.label]))
    : {};

  return (
    <section className="atrium-body-stage" aria-labelledby="atrium-body-title">
      <div className="atrium-body-head">
        <span>Body map</span>
        <h3 id="atrium-body-title">Atrium view</h3>
      </div>

      <div className="atrium-body-model">
        <HumanBody3D
          language={language}
          highlightRegion={highlightedAtriumRegion}
          focusRegion={focusedAtriumRegion}
          selectedSubregion={selectedSubregion}
          subregionLabels={subregionLabels}
          onPickRegion={(region) => onSelect(atriumRegionToBodyRegion(region))}
          onPickSubregion={({ regionId, subregionId }) =>
            onSelectSubregion?.(focusedRegion ?? atriumRegionToBodyRegion(regionId), subregionId)
          }
        />
      </div>
    </section>
  );
}

export function BodyRegionButtons({
  language,
  highlightedRegion,
  selectedRegions,
  onSelect,
}: BodyRegionButtonsProps) {
  const labels = regionLabels[language];

  return (
    <div className="atrium-region-buttons" aria-label="Body regions">
      {bodyRegions.map((region) => {
        const isSelected = highlightedRegion === region || selectedRegions.includes(region);

        return (
          <button
            key={region}
            type="button"
            aria-pressed={isSelected}
            aria-label={
              isSelected ? `Remove ${labels[region]} from Atlas body areas` : `Add ${labels[region]} to Atlas body areas`
            }
            className={isSelected ? "active" : ""}
            onClick={() => onSelect(region)}
          >
            {labels[region]}
          </button>
        );
      })}
    </div>
  );
}

function bodyRegionToAtriumRegion(region: BodyRegion) {
  const map: Record<BodyRegion, string> = {
    head: "head",
    chest: "torso_chest",
    abdomen: "torso_abdomen",
    back: "kidneys",
    leftArm: "arm_left",
    rightArm: "arm_right",
    leftHand: "hand_left",
    rightHand: "hand_right",
    leftLeg: "leg_left",
    rightLeg: "leg_right",
    leftFoot: "foot_left",
    rightFoot: "foot_right",
  };
  return map[region];
}

function atriumRegionToBodyRegion(region: string): BodyRegion {
  if (region === "head" || region === "brain") return "head";
  if (region === "torso_chest" || region === "heart" || region === "lungs") return "chest";
  if (region === "arm_left") return "leftArm";
  if (region === "arm_right") return "rightArm";
  if (region === "hand_left") return "leftHand";
  if (region === "hand_right") return "rightHand";
  if (region === "leg_left") return "leftLeg";
  if (region === "leg_right") return "rightLeg";
  if (region === "foot_left") return "leftFoot";
  if (region === "foot_right") return "rightFoot";
  if (region === "skeleton") return "back";
  return "abdomen";
}
