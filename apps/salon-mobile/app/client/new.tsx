import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ErrorBanner, FieldRow, FormScreen, TextField, useModalHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { createClient } from '@/lib/api/clients';

export default function NewClientScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const modalHeader = useModalHeader();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canSave = firstName.trim().length > 0 && email.trim().length > 0 && !saving && !!companyId;

  const handleSave = async () => {
    if (!companyId || !canSave) {
      setErrorMessage(t('client.validationRequired'));
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const client = await createClient(companyId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }, locationId);
      router.replace({ pathname: '/client/[id]', params: { id: client.id } });
    } catch {
      setErrorMessage(t('client.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('client.addNew')}
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={!canSave} />}>
        <ErrorBanner message={errorMessage} />
        <FieldRow>
          <TextField label={t('client.firstName')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" textContentType="givenName" />
          <TextField label={t('client.lastName')} value={lastName} onChangeText={setLastName} autoCapitalize="words" textContentType="familyName" />
        </FieldRow>
        <TextField
          label={t('client.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t('client.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </FormScreen>
    </>
  );
}
