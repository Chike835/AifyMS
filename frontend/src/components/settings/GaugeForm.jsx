import AttributeManager from './AttributeManager';

const GaugeForm = (props) => (
  <AttributeManager
    {...props}
    type="gauges"
    singularLabel="Gauge"
    pluralLabel="Gauges"
  />
);

export default GaugeForm;

