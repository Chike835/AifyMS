import AttributeManager from './AttributeManager';

const BrandForm = (props) => (
  <AttributeManager
    {...props}
    type="brands"
    singularLabel="Brand"
    pluralLabel="Brands"
  />
);

export default BrandForm;

