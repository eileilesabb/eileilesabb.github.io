// Shared by static templates and the browser: one price model for every page.
export const balconyShapes = [
  { id: 'straight', title: 'Прямой', diagram: 6, sides: [3000], depth: 1000, floorFactor: 1 },
  { id: 'l', title: 'Г-образный', diagram: 1, sides: [3000, 1000], depth: 1000, floorFactor: 1 },
  { id: 'boot', title: '«Сапог»', diagram: 2, sides: [3000, 1200, 700], depth: 1200, floorFactor: .85 },
  { id: 'bay', title: 'Эркер', diagram: 3, sides: [1000, 2000, 1000], depth: 1200, floorFactor: .85 },
  { id: 'u', title: 'П-образный', diagram: 4, sides: [1000, 3000, 1000], depth: 1000, floorFactor: 1 },
  { id: 'iron', title: '«Утюг»', diagram: 5, sides: [2400, 2400], depth: 1500, floorFactor: .5 }
];

export const windowProfiles = [
  { id: 'rehau', title: 'REHAU', material: 'ПВХ', type: 'warm', rate: 3850, text: 'Тёплое остекление со стеклопакетом. Систему, фурнитуру и заполнение подбираем под размеры проёма и условия эксплуатации.' },
  { id: 'melke', title: 'MELKE', material: 'ПВХ', type: 'warm', rate: 3850, text: 'ПВХ-системы для тёплого остекления. Сравниваем варианты по теплоизоляции, световому проёму и комплектации.' },
  { id: 'kbe', title: 'KBE', material: 'ПВХ', type: 'warm', rate: 3850, text: 'ПВХ-профили для окон и балконных конструкций. Подбираем систему вместе со стеклопакетом, армированием и способом открывания.' },
  { id: 'provedal', title: 'Provedal', material: 'Алюминий', type: 'cold', rate: 3120, text: 'Холодное алюминиевое остекление для защиты от осадков и ветра. Раздвижные створки экономят место на балконе.' }
];

// Initial reference rates are approximate; MELKE/KBE share the PVC estimate
// until the selected system is quoted after measuring.
export const balconyRates = {
  accessoriesPerMetre: 450, installationPerSquare: 1200,
  walls: { none: 0, pvc: 1200, lining: 1800, laminate: 1600, paint: 2100 },
  ceiling: { none: 0, pvc: 1200, lining: 1800, paint: 2100 },
  floor: { none: 0, laminate: 1900, tiles: 2600, linoleum: 1300 },
  insulation: { none: 0, basic: 1100, enhanced: 1650 },
  electrical: { none: 0, light: 4500, full: 8500 },
  exterior: { none: 0, siding: 1800, metal: 2100 },
  heatedFloor: 2500, wardrobe: 18000, dryer: 3500
};

const bounded = (value, min, max, name) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new RangeError(`${name}: укажите число от ${min} до ${max} мм.`);
  return number / 1000;
};

export function balconyAreas(input) {
  const shape = balconyShapes.find((item) => item.id === input.shape);
  if (!shape) throw new RangeError('Выберите тип балкона.');
  if (!Array.isArray(input.sides) || input.sides.length !== shape.sides.length) throw new RangeError('Заполните размеры всех секций остекления.');
  const sides = input.sides.map((side) => bounded(side, 500, 10000, 'Ширина секции'));
  const height = bounded(input.height, 500, 5000, 'Высота остекления');
  const roomHeight = bounded(input.roomHeight ?? 2700, 1800, 4000, 'Высота помещения');
  const depth = bounded(input.depth ?? shape.depth, 500, 4000, 'Глубина балкона');
  const main = shape.id === 'u' ? sides[1] : shape.id === 'bay' ? sides[1] + .5 * (sides[0] + sides[2]) : sides[0];
  const floor = main * depth * shape.floorFactor;
  const glassLength = sides.reduce((sum, side) => sum + side, 0);
  const glazing = glassLength * height;
  const perimeter = 2 * (main + depth);
  const walls = Math.max(.1, perimeter * roomHeight - glazing);
  const exterior = glassLength * Math.max(0, roomHeight - height);
  return { floor, ceiling: floor, walls, glazing, exterior, glassLength };
}

export function calculateGlazing(input) {
  const areas = balconyAreas(input);
  const profile = windowProfiles.find((item) => item.id === input.profile);
  if (!profile || profile.type !== input.type) throw new RangeError('Выберите профиль, соответствующий типу остекления.');
  const window = Math.round(areas.glazing * profile.rate);
  const accessories = input.accessories ? Math.round(areas.glassLength * balconyRates.accessoriesPerMetre) : 0;
  const installation = input.installation ? Math.round(areas.glazing * balconyRates.installationPerSquare) : 0;
  const total = window + accessories + installation;
  return { areas, window, accessories, installation, total, monthly: Math.ceil(total / 18) };
}

export function calculateFinishing(input) {
  const areas = balconyAreas(input);
  const costs = {};
  for (const [field, area] of [['walls','walls'], ['ceiling','ceiling'], ['floor','floor'], ['exterior','exterior']]) {
    const rate = balconyRates[field][input[field] ?? 'none'];
    if (rate === undefined) throw new RangeError('Выберите материал из списка.');
    costs[field] = Math.round(areas[area] * rate);
  }
  const insulation = balconyRates.insulation[input.insulation ?? 'none'];
  const electrical = balconyRates.electrical[input.electrical ?? 'none'];
  if (insulation === undefined || electrical === undefined) throw new RangeError('Выберите дополнительные работы из списка.');
  costs.insulation = Math.round((areas.floor + areas.ceiling + areas.walls) * insulation);
  costs.electrical = electrical;
  costs.heatedFloor = input.heatedFloor ? Math.round(areas.floor * balconyRates.heatedFloor) : 0;
  costs.wardrobe = input.wardrobe ? balconyRates.wardrobe : 0;
  costs.dryer = input.dryer ? balconyRates.dryer : 0;
  const total = Object.values(costs).reduce((sum, amount) => sum + amount, 0);
  return { areas, costs, total, monthly: Math.ceil(total / 18) };
}
