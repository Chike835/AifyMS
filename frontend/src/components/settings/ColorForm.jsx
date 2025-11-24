import AttributeManager from './AttributeManager';

const ColorForm = (props) => (
  <AttributeManager
    {...props}
    type="colors"
    singularLabel="Color"
    pluralLabel="Colors"
  />
);

export default ColorForm;

