<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Captcha;
use App\Validator;
use App\Ids;
use App\Services\Complaints;
use App\Repo\Categories;
use App\Repo\Institutions;

final class ComplaintController
{
    public function submitForm(array $params): void
    {
        view('complaints/submit', [
            'title'       => t('complaint.submitTitle'),
            'categories'  => Categories::all(),
            'institutions'=> Institutions::activeByCategory(),
            'minBody'     => (int) cfg('MIN_BODY_LENGTH', 100),
            'maxFiles'    => (int) cfg('MAX_ATTACHMENTS', 3),
            'maxBytes'    => (int) cfg('MAX_ATTACHMENT_TOTAL_BYTES', 5242880),
            'captcha'     => !Auth::check() && Captcha::enabled(),
        ], 'app');
    }

    public function submit(array $params): void
    {
        $userId = Auth::id(); // null when anonymous
        $minBody = (int) cfg('MIN_BODY_LENGTH', 100);

        $input = [
            'categoryId'          => (string) ($_POST['categoryId'] ?? ''),
            'institutionId'       => (string) ($_POST['institutionId'] ?? ''),
            'institutionFreeText' => (string) ($_POST['institutionFreeText'] ?? ''),
            'title'               => trim((string) ($_POST['title'] ?? '')),
            'body'                => trim((string) ($_POST['body'] ?? '')),
            'urgent'              => !empty($_POST['urgent']),
            'contactName'         => trim((string) ($_POST['contactName'] ?? '')),
            'contactEmail'        => trim((string) ($_POST['contactEmail'] ?? '')),
        ];

        $v = (new Validator())
            ->required('categoryId', $input['categoryId'], t('complaint.selectCategory'))
            ->minLen('title', $input['title'], 5, t('complaint.title'))
            ->minLen('body', $input['body'], $minBody, t('complaint.bodyHint', ['min' => $minBody]));

        if ($input['institutionId'] === '' && $input['institutionFreeText'] === '') {
            $v->add('institution', t('complaint.selectInstitution'));
        }
        if ($input['institutionId'] !== '' && !Institutions::findActive($input['institutionId'])) {
            $v->add('institution', t('complaint.selectInstitution'));
        }
        if ($input['contactEmail'] !== '' && !filter_var($input['contactEmail'], FILTER_VALIDATE_EMAIL)) {
            $v->add('contactEmail', t('auth.email'));
        }

        // Anonymous submissions require captcha (when configured).
        if (!Auth::check() && Captcha::enabled() && !Captcha::verify($_POST['h-captcha-response'] ?? null)) {
            $v->add('captcha', t('auth.captchaRequired'));
        }

        // Attachments.
        [$files, $fileError] = $this->handleUploads();
        if ($fileError) {
            $v->add('attachments', $fileError);
        }

        if ($v->fails()) {
            $this->cleanup($files);
            flash_old($input);
            view('complaints/submit', [
                'title' => t('complaint.submitTitle'),
                'categories' => Categories::all(),
                'institutions' => Institutions::activeByCategory(),
                'minBody' => $minBody,
                'maxFiles' => (int) cfg('MAX_ATTACHMENTS', 3),
                'maxBytes' => (int) cfg('MAX_ATTACHMENT_TOTAL_BYTES', 5242880),
                'captcha' => !Auth::check() && Captcha::enabled(),
                'errors' => $v->errors(),
            ], 'app');
            return;
        }

        $result = Complaints::submit($input, $files, $userId, client_ip(), user_agent());
        view('complaints/submitted', [
            'title' => t('complaint.submitted.title'),
            'publicId' => $result['publicId'],
            'status' => $result['status'],
        ], 'app');
    }

    /**
     * Validate + move uploaded files.
     * @return array{0:array<int,array>,1:?string} [files, error]
     */
    private function handleUploads(): array
    {
        $maxFiles = (int) cfg('MAX_ATTACHMENTS', 3);
        $maxTotal = (int) cfg('MAX_ATTACHMENT_TOTAL_BYTES', 5242880);
        $maxFile  = (int) cfg('MAX_ATTACHMENT_FILE_BYTES', 5242880);
        $allowed  = (array) cfg('ALLOWED_ATTACHMENT_MIME', []);
        $uploadDir = rtrim((string) cfg('UPLOAD_DIR', VLC_ROOT . '/storage/uploads'), '/');

        if (empty($_FILES['attachments']) || !is_array($_FILES['attachments']['name'])) {
            return [[], null];
        }
        $names = $_FILES['attachments']['name'];
        $count = count(array_filter($names, static fn ($n) => $n !== ''));
        if ($count === 0) {
            return [[], null];
        }
        if ($count > $maxFiles) {
            return [[], t('dropzone.tooManyFiles', ['max' => $maxFiles])];
        }

        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0775, true);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $files = [];
        $total = 0;
        for ($i = 0; $i < count($names); $i++) {
            if (($_FILES['attachments']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) {
                $this->cleanup($files);
                return [[], t('errors.generic')];
            }
            $tmp = $_FILES['attachments']['tmp_name'][$i];
            $size = (int) $_FILES['attachments']['size'][$i];
            $total += $size;
            if ($size > $maxFile || $total > $maxTotal) {
                $this->cleanup($files);
                return [[], t('dropzone.sizeExceeded', ['max' => human_bytes($maxTotal)])];
            }
            $mime = $finfo->file($tmp) ?: 'application/octet-stream';
            if (!in_array($mime, $allowed, true)) {
                $this->cleanup($files);
                return [[], t('dropzone.unsupportedType', ['name' => $names[$i]])];
            }
            $ext = pathinfo($names[$i], PATHINFO_EXTENSION);
            $stored = $uploadDir . '/' . Ids::uuid() . ($ext ? '.' . strtolower($ext) : '');
            if (!move_uploaded_file($tmp, $stored)) {
                $this->cleanup($files);
                return [[], t('errors.generic')];
            }
            $files[] = [
                'originalFilename' => $names[$i],
                'storagePath' => $stored,
                'mimeType' => $mime,
                'size' => $size,
            ];
        }
        return [$files, null];
    }

    private function cleanup(array $files): void
    {
        foreach ($files as $f) {
            if (!empty($f['storagePath']) && is_file($f['storagePath'])) {
                @unlink($f['storagePath']);
            }
        }
    }

    public function mine(array $params): void
    {
        $user = Auth::requireAuth();
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $result = Complaints::listComplaints([
            'userId' => $user['id'],
            'isAdmin' => false,
            'page' => $page,
            'size' => 10,
        ]);
        view('complaints/mine', ['title' => t('nav.myComplaints'), 'result' => $result], 'app');
    }

    public function show(array $params): void
    {
        $user = Auth::requireAuth();
        $complaint = Complaints::getByPublicId($params['publicId'], $user['id'], Auth::isAdmin());
        if (!$complaint) {
            http_response_code(404);
            view('errors/404', [], 'app');
            return;
        }
        view('complaints/detail', ['title' => $complaint['publicId'], 'c' => $complaint], 'app');
    }
}
