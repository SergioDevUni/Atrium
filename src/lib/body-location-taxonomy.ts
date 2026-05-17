import type { BodyRegion, Language } from "./types";

export type BodySubregionOption = {
  id: string;
  label: Record<Language, string>;
};

export const bodySubregionTaxonomy: Record<BodyRegion, BodySubregionOption[]> = {
  head: [
    option("forehead", "Forehead", "Frente"),
    option("top_head", "Top of head", "Parte superior de la cabeza"),
    option("back_head", "Back of head", "Parte posterior de la cabeza"),
    option("face", "Face", "Cara"),
    option("eye_area", "Eye area", "Zona de los ojos"),
    option("ear_area", "Ear area", "Zona del oido"),
    option("nose_sinus", "Nose / sinus", "Nariz / senos nasales"),
    option("mouth_jaw", "Mouth / jaw", "Boca / mandibula"),
    option("neck", "Neck", "Cuello"),
  ],
  chest: [
    option("upper_left_chest", "Upper left chest", "Pecho superior izquierdo"),
    option("upper_center_chest", "Upper center chest", "Pecho superior central"),
    option("upper_right_chest", "Upper right chest", "Pecho superior derecho"),
    option("lower_left_chest", "Lower left chest", "Pecho inferior izquierdo"),
    option("lower_center_chest", "Lower center chest", "Pecho inferior central"),
    option("lower_right_chest", "Lower right chest", "Pecho inferior derecho"),
  ],
  abdomen: [
    option("upper_left_abdomen", "Upper left abdomen", "Abdomen superior izquierdo"),
    option("upper_center_stomach", "Upper center / stomach", "Centro superior / estomago"),
    option("upper_right_abdomen", "Upper right abdomen", "Abdomen superior derecho"),
    option("middle_left_abdomen", "Middle left abdomen", "Abdomen medio izquierdo"),
    option("navel_center", "Center / navel", "Centro / ombligo"),
    option("middle_right_abdomen", "Middle right abdomen", "Abdomen medio derecho"),
    option("lower_left_abdomen", "Lower left abdomen", "Abdomen inferior izquierdo"),
    option("lower_center_pelvis", "Lower center / pelvis", "Centro inferior / pelvis"),
    option("lower_right_abdomen", "Lower right abdomen", "Abdomen inferior derecho"),
  ],
  back: [
    option("upper_left_back", "Upper left back", "Espalda superior izquierda"),
    option("upper_center_back", "Upper center back", "Espalda superior central"),
    option("upper_right_back", "Upper right back", "Espalda superior derecha"),
    option("mid_left_back", "Middle left back", "Espalda media izquierda"),
    option("mid_right_back", "Middle right back", "Espalda media derecha"),
    option("lower_left_back", "Lower left back", "Espalda inferior izquierda"),
    option("lower_center_back", "Lower center back", "Espalda inferior central"),
    option("lower_right_back", "Lower right back", "Espalda inferior derecha"),
  ],
  leftArm: limbArmOptions(),
  rightArm: limbArmOptions(),
  leftHand: handOptions(),
  rightHand: handOptions(),
  leftLeg: legOptions(),
  rightLeg: legOptions(),
  leftFoot: footOptions(),
  rightFoot: footOptions(),
};

export function getBodySubregionOptions(region: BodyRegion, language: Language) {
  return bodySubregionTaxonomy[region].map((subregion) => ({
    id: subregion.id,
    label: subregion.label[language],
  }));
}

export function getBodySubregionLabel(region: BodyRegion, subregionId: string, language: Language) {
  return (
    bodySubregionTaxonomy[region].find((subregion) => subregion.id === subregionId)?.label[language] ??
    humanizeSubregionId(subregionId)
  );
}

function limbArmOptions() {
  return [
    option("upper_arm", "Upper arm", "Brazo superior"),
    option("lower_arm", "Lower arm / forearm", "Brazo inferior / antebrazo"),
  ];
}

function legOptions() {
  return [
    option("upper_leg", "Upper leg / thigh", "Pierna superior / muslo"),
    option("lower_leg", "Lower leg / shin-calf", "Pierna inferior / espinilla-pantorrilla"),
  ];
}

function handOptions() {
  return [
    option("palm", "Palm", "Palma"),
    option("back_of_hand", "Back of hand", "Dorso de la mano"),
    option("thumb", "Thumb", "Pulgar"),
    option("index_finger", "Index finger", "Dedo indice"),
    option("middle_finger", "Middle finger", "Dedo medio"),
    option("ring_finger", "Ring finger", "Dedo anular"),
    option("pinky_finger", "Pinky finger", "Dedo menique"),
  ];
}

function footOptions() {
  return [
    option("top_of_foot", "Top of foot", "Parte superior del pie"),
    option("sole", "Sole", "Planta del pie"),
    option("heel", "Heel", "Talon"),
    option("arch", "Arch", "Arco"),
    option("big_toe", "Big toe", "Dedo gordo del pie"),
    option("other_toes", "Other toes", "Otros dedos del pie"),
  ];
}

function option(id: string, en: string, es: string): BodySubregionOption {
  return {
    id,
    label: { en, es },
  };
}

function humanizeSubregionId(subregionId: string) {
  return subregionId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
