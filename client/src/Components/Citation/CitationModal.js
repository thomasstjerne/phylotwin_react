import {  Button, Form, Input, Modal, Spin, Alert } from 'antd';
import React, {useState, useEffect} from 'react';
import { axiosWithAuth } from '../../Auth/userApi';
import config from '../../config';
// reset form fields when modal is form, closed

const CitationForm = ({ open, onCancel, onFinish, jobid, defaultValues }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  useEffect(() => {}, [open])
  const onFinishFailed = ({ errorFields }) => {
    form.scrollToField(errorFields[0].name);
  };
  const submitData = async (values) => {
    setLoading(true)
    try {
    const res =  await axiosWithAuth.post(`${config.phylonextWebservice}/job/${jobid}/derivedDataset`, values);

    setSubmissionError(null);
    setLoading(false)
    onFinish(res?.data)
    } catch (error) {
        setLoading(false)
        setSubmissionError(error);
    }
   
  };


  return (
    <Modal 
        title="Cite this pipeline run" 
        open={open} 
        onCancel={onCancel}
        footer={null}
        >
<Spin spinning={loading} delay={500}>
        {submissionError && <Alert type='error' description={submissionError?.response?.data} closable onClose={() => setSubmissionError(null)} />}
      <Form form={form} layout="vertical" onFinish={submitData} onFinishFailed={onFinishFailed} name="citationform" >
        <Form.Item
          initialValue={defaultValues?.jobName}
          name="title"
          label="Title"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          initialValue={defaultValues?.jobDescription}
          name="description"
          label="Description"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input.TextArea />
        </Form.Item>
        <Form.Item>
            
            <Button
              type="primary"
              htmlType="submit"
            >
              Save
            </Button>
          </Form.Item>
          
      </Form>
      </Spin>
    </Modal>
  );
};

export default CitationForm;